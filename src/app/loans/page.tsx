'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { QuickExpenseModal } from '@/components/expenses/QuickExpenseModal';
import { formatCOP } from '@/lib/utils';
import { formatShortDateSpanish } from '@/lib/dayjs';
import { 
  useUser, 
  useLoans, 
  usePaymentMethods, 
  useCategories,
  useInvalidateFinance 
} from '@/lib/api-hooks';
import { 
  HandCoins, 
  Plus, 
  Search, 
  X, 
  BadgePercent, 
  Landmark, 
  CircleDollarSign, 
  TrendingUp, 
  Calendar, 
  Phone, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Edit3, 
  ArrowRight, 
  FileText, 
  DollarSign, 
  Receipt,
  Percent,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import { PageBanner, Pagination } from '@/components/ui';

export default function LoansPage() {
  const invalidateFinance = useInvalidateFinance();
  const { data: user } = useUser();
  const { data: paymentMethods = [] } = usePaymentMethods();
  const { data: categories = [] } = useCategories();

  // Mode: 'LENT' (Por Cobrar / Me deben) vs 'BORROWED' (Por Pagar / Yo debo)
  const [loanTypeTab, setLoanTypeTab] = useState<'LENT' | 'BORROWED'>('LENT');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'PAID' | 'ALL'>('ACTIVE');

  // Fetch loans with TanStack Query
  const { data: loansData, isLoading: loadingLoans, refetch: refetchLoans } = useLoans(
    search, 
    statusFilter, 
    loanTypeTab
  );
  const loans = loansData?.loans || [];
  const summary = loansData?.summary || {
    active_loans_count: 0,
    total_active_capital_lent: 0,
    total_initial_capital_lent: 0,
    total_interest_collected: 0,
    total_expected_interest: 0,
    total_balance_due: 0,
    active_lent_count: 0,
    active_borrowed_count: 0,
  };

  // UI Modals state
  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false);
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<any | null>(null);
  const [selectedLoanForEdit, setSelectedLoanForEdit] = useState<any | null>(null);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);

  // New Loan Form State
  const [newLoanType, setNewLoanType] = useState<'LENT' | 'BORROWED'>('LENT');
  const [newBorrowerName, setNewBorrowerName] = useState('');
  const [newBorrowerPhone, setNewBorrowerPhone] = useState('');
  const [newInitialAmount, setNewInitialAmount] = useState('');
  const [newDurationMonths, setNewDurationMonths] = useState('1');
  const [interestType, setInterestType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [newInterestRate, setNewInterestRate] = useState('10');
  const [newFixedInterest, setNewFixedInterest] = useState('');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDueDate, setNewDueDate] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isCreatingLoan, setIsCreatingLoan] = useState(false);

  // Payment Form State
  const [payCapital, setPayCapital] = useState('');
  const [payInterest, setPayInterest] = useState('');
  const [payMethod, setPayMethod] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Edit Loan Form State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDurationMonths, setEditDurationMonths] = useState('1');
  const [editNotes, setEditNotes] = useState('');
  const [isUpdatingLoan, setIsUpdatingLoan] = useState(false);

  // Consolidated search metrics if multiple loans for same person
  const debtorConsolidated = useMemo(() => {
    if (!search || loans.length <= 1) return null;
    const matching = loans.filter((l: any) =>
      l.borrower_name.toLowerCase().includes(search.toLowerCase())
    );
    if (matching.length <= 1) return null;

    const totalDue = matching.reduce((acc: number, l: any) => acc + (Number(l.remaining_to_collect) ?? Number(l.current_balance) ?? 0), 0);
    const totalCapital = matching.reduce((acc: number, l: any) => acc + (Number(l.initial_amount) || 0), 0);
    const totalRemainingCap = matching.reduce((acc: number, l: any) => acc + (Number(l.remaining_capital) || 0), 0);
    const totalProjectedInt = matching.reduce((acc: number, l: any) => acc + (Number(l.projected_interest) || 0), 0);
    const totalCollected = matching.reduce((acc: number, l: any) => acc + (Number(l.total_collected) || 0), 0);

    return {
      name: matching[0].borrower_name,
      count: matching.length,
      totalDue,
      totalCapital,
      totalRemainingCap,
      totalProjectedInt,
      totalCollected,
    };
  }, [search, loans]);

  // Group loans by debtor (borrower_name) to avoid duplicate cards for same person
  const groupedDebtors = useMemo(() => {
    const map = new Map<string, {
      borrower_name: string;
      borrower_phone: string | null;
      loans: any[];
      total_current_balance: number;
      total_initial_amount: number;
      total_remaining_capital: number;
      total_paid_capital: number;
      total_paid_interest: number;
      total_monthly_interest: number;
      total_projected_interest: number;
      total_to_collect: number;
      total_collected: number;
      total_remaining_to_collect: number;
      has_overdue: boolean;
      all_paid: boolean;
    }>();

    loans.forEach((loan: any) => {
      const key = (loan.borrower_name || 'Sin Nombre').trim().toLowerCase();
      const isPaid = loan.status === 'PAID';
      const isOverdue =
        !isPaid &&
        loan.due_date &&
        new Date(loan.due_date).getTime() < new Date().setHours(0, 0, 0, 0);

      const remainingCap = Number(loan.remaining_capital) || Number(loan.current_balance) || 0;
      const loanMonthly =
        loan.monthly_interest ||
        (loan.interest_rate > 0
          ? Math.round(remainingCap * (loan.interest_rate / 100))
          : Number(loan.expected_interest) || 0);

      const projInt = Number(loan.projected_interest) || 0;
      const totToCollect = Number(loan.total_to_collect) || (remainingCap + projInt);
      const totCollected = Number(loan.total_collected) || ((Number(loan.paid_capital) || 0) + (Number(loan.paid_interest) || 0));
      const remToCollect = Number(loan.remaining_to_collect) ?? Math.max(0, totToCollect - totCollected);

      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          borrower_name: loan.borrower_name,
          borrower_phone: loan.borrower_phone || null,
          loans: [loan],
          total_current_balance: remainingCap,
          total_initial_amount: Number(loan.initial_amount) || 0,
          total_remaining_capital: remainingCap,
          total_paid_capital: Number(loan.paid_capital) || 0,
          total_paid_interest: Number(loan.paid_interest) || 0,
          total_monthly_interest: isPaid ? 0 : loanMonthly,
          total_projected_interest: isPaid ? 0 : projInt,
          total_to_collect: totToCollect,
          total_collected: totCollected,
          total_remaining_to_collect: isPaid ? 0 : remToCollect,
          has_overdue: Boolean(isOverdue),
          all_paid: isPaid,
        });
      } else {
        existing.loans.push(loan);
        existing.total_current_balance += remainingCap;
        existing.total_initial_amount += Number(loan.initial_amount) || 0;
        existing.total_remaining_capital += remainingCap;
        existing.total_paid_capital += Number(loan.paid_capital) || 0;
        existing.total_paid_interest += Number(loan.paid_interest) || 0;
        if (!isPaid) {
          existing.total_monthly_interest += loanMonthly;
          existing.total_projected_interest += projInt;
          existing.total_remaining_to_collect += remToCollect;
        }
        existing.total_to_collect += totToCollect;
        existing.total_collected += totCollected;
        if (isOverdue) existing.has_overdue = true;
        if (!isPaid) existing.all_paid = false;
        if (!existing.borrower_phone && loan.borrower_phone) {
          existing.borrower_phone = loan.borrower_phone;
        }
      }
    });

    return Array.from(map.values());
  }, [loans]);

  // Pagination & Debtor Collapsing State (Commercial scale)
  const ITEMS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedDebtorKeys, setExpandedDebtorKeys] = useState<Set<string>>(new Set());

  // Reset pagination & fold all cards on tab, search, or status filter change
  useEffect(() => {
    setCurrentPage(1);
    setExpandedDebtorKeys(new Set());
  }, [loanTypeTab, search, statusFilter]);

  const totalDebtors = groupedDebtors.length;
  const totalPages = Math.ceil(totalDebtors / ITEMS_PER_PAGE) || 1;

  const paginatedDebtors = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return groupedDebtors.slice(start, start + ITEMS_PER_PAGE);
  }, [groupedDebtors, currentPage, ITEMS_PER_PAGE]);

  const toggleDebtor = (key: string) => {
    setExpandedDebtorKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isAllExpanded = useMemo(() => {
    if (paginatedDebtors.length === 0) return false;
    return paginatedDebtors.every((d: any) =>
      expandedDebtorKeys.has((d.borrower_name || '').trim().toLowerCase())
    );
  }, [paginatedDebtors, expandedDebtorKeys]);

  const toggleAllCurrentPage = () => {
    if (isAllExpanded) {
      setExpandedDebtorKeys(new Set());
    } else {
      setExpandedDebtorKeys(prev => {
        const next = new Set(prev);
        paginatedDebtors.forEach((d: any) => {
          next.add((d.borrower_name || '').trim().toLowerCase());
        });
        return next;
      });
    }
  };

  // Calculated Preview for New Loan
  const calculatedNewInterest = useMemo(() => {
    const principal = Number(newInitialAmount) || 0;
    if (principal <= 0) return 0;
    if (interestType === 'PERCENT') {
      const rate = Number(newInterestRate) || 0;
      return Math.round(principal * (rate / 100));
    } else {
      return Number(newFixedInterest) || 0;
    }
  }, [newInitialAmount, interestType, newInterestRate, newFixedInterest]);

  const calculatedProjectedInterest = useMemo(() => {
    const months = Number(newDurationMonths) || 1;
    return calculatedNewInterest * months;
  }, [calculatedNewInterest, newDurationMonths]);

  const calculatedNewTotal = (Number(newInitialAmount) || 0) + calculatedProjectedInterest;
  const calculatedTotalPayment = (Number(payCapital) || 0) + (Number(payInterest) || 0);

  // Unique contacts list from loans for quick auto-fill
  const existingContacts = useMemo(() => {
    const map = new Map<string, string>();
    loans.forEach((l: any) => {
      if (l.borrower_name && !map.has(l.borrower_name)) {
        map.set(l.borrower_name, l.borrower_phone || '');
      }
    });
    return Array.from(map.entries()).map(([name, phone]) => ({ name, phone }));
  }, [loans]);

  // Open New Loan prefilled for a specific person
  const handleOpenNewLoanForDebtor = (loan: any) => {
    const personLoans = loans.filter(
      (l: any) => l.borrower_name.toLowerCase() === loan.borrower_name.toLowerCase()
    );
    setNewLoanType(loan.loan_type || loanTypeTab);
    setNewBorrowerName(loan.borrower_name);
    setNewBorrowerPhone(loan.borrower_phone || '');
    setNewInitialAmount('');
    setNewDurationMonths('1');
    setInterestType('PERCENT');
    setNewInterestRate('10');
    setNewFixedInterest('');
    setNewStartDate(new Date().toISOString().split('T')[0]);
    setNewDueDate('');
    setNewPaymentMethod(paymentMethods[0]?.name || 'Efectivo');
    setNewNotes(`Préstamo #${personLoans.length + 1}`);
    setIsNewLoanOpen(true);
  };

  const resetNewLoanForm = (presetType?: 'LENT' | 'BORROWED') => {
    setNewLoanType(presetType || loanTypeTab);
    setNewBorrowerName('');
    setNewBorrowerPhone('');
    setNewInitialAmount('');
    setNewDurationMonths('1');
    setInterestType('PERCENT');
    setNewInterestRate('10');
    setNewFixedInterest('');
    setNewStartDate(new Date().toISOString().split('T')[0]);
    setNewDueDate('');
    setNewPaymentMethod(paymentMethods[0]?.name || 'Efectivo');
    setNewNotes('');
  };

  // Handle Create Loan
  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBorrowerName.trim()) {
      toast.error('Ingresa el nombre de la persona o acreedor');
      return;
    }
    const principal = Number(newInitialAmount);
    if (isNaN(principal) || principal <= 0) {
      toast.error('El capital debe ser mayor a 0');
      return;
    }

    setIsCreatingLoan(true);
    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loan_type: newLoanType,
          borrower_name: newBorrowerName.trim(),
          borrower_phone: newBorrowerPhone.trim() || null,
          initial_amount: principal,
          duration_months: Number(newDurationMonths) || 1,
          interest_rate: interestType === 'PERCENT' ? Number(newInterestRate) || 0 : 0,
          expected_interest: calculatedNewInterest,
          start_date: newStartDate,
          due_date: newDueDate || null,
          payment_method: newPaymentMethod || paymentMethods[0]?.name || 'Efectivo',
          notes: newNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const savedName = newBorrowerName.trim();
        toast.success(
          newLoanType === 'BORROWED'
            ? `Deuda con ${newBorrowerName.trim()} registrada`
            : `Préstamo a ${newBorrowerName.trim()} registrado`
        );
        setIsNewLoanOpen(false);
        resetNewLoanForm();
        refetchLoans();
        invalidateFinance();
        if (savedName) {
          setExpandedDebtorKeys(prev => new Set(prev).add(savedName.toLowerCase()));
        }
      } else {
        toast.error(data.error || 'Error al registrar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsCreatingLoan(false);
    }
  };

  // Open Payment Modal with Smart Defaults
  const handleOpenPayment = (loan: any) => {
    setSelectedLoanForPayment(loan);
    const remCap = Number(loan.remaining_capital) || Number(loan.current_balance) || 0;
    const monthlyFee =
      loan.monthly_interest ||
      (loan.interest_rate > 0 ? Math.round(remCap * (loan.interest_rate / 100)) : Number(loan.expected_interest) || 0);
    setPayCapital('');
    setPayInterest(String(monthlyFee > 0 ? monthlyFee : ''));
    setPayMethod(paymentMethods[0]?.name || 'Nequi');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayNotes('');
  };

  // Handle Submit Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanForPayment) return;

    const cap = Number(payCapital) || 0;
    const int = Number(payInterest) || 0;
    const total = cap + int;

    if (total <= 0) {
      toast.error('Ingresa un monto de capital o interés a abonar');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await fetch(`/api/loans/${selectedLoanForPayment.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capital_amount: cap,
          interest_amount: int,
          payment_method: payMethod || 'Nequi',
          payment_date: payDate,
          notes: payNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Abono registrado');
        const borrower = selectedLoanForPayment?.borrower_name;
        setSelectedLoanForPayment(null);
        refetchLoans();
        invalidateFinance();
        if (borrower) {
          setExpandedDebtorKeys(prev => new Set(prev).add(borrower.trim().toLowerCase()));
        }
      } else {
        toast.error(data.error || 'Error al registrar abono');
      }
    } catch {
      toast.error('Error de red al procesar el abono');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Delete Payment / Revert
  const handleDeletePayment = async (loanId: string, paymentId: string) => {
    if (!confirm('¿Revertir este abono? Los saldos y el balance de tu cuenta se actualizarán de inmediato.')) {
      return;
    }

    try {
      const res = await fetch(`/api/loans/${loanId}/payments?paymentId=${paymentId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Abono revertido');
        refetchLoans();
        invalidateFinance();
      } else {
        toast.error(data.error || 'Error al revertir');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  // Delete Entire Loan
  const handleDeleteLoan = async (loanId: string, name: string) => {
    if (!confirm(`¿Eliminar definitivamente el registro de "${name}" y todos sus abonos?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/loans/${loanId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Registro de ${name} eliminado`);
        refetchLoans();
        invalidateFinance();
      } else {
        toast.error(data.error || 'Error al eliminar');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (loan: any) => {
    setSelectedLoanForEdit(loan);
    setEditName(loan.borrower_name);
    setEditPhone(loan.borrower_phone || '');
    setEditDueDate(loan.due_date || '');
    setEditDurationMonths(String(loan.duration_months || 1));
    setEditNotes(loan.notes || '');
  };

  // Handle Submit Edit
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanForEdit) return;

    setIsUpdatingLoan(true);
    try {
      const res = await fetch(`/api/loans/${selectedLoanForEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrower_name: editName.trim(),
          borrower_phone: editPhone.trim() || null,
          due_date: editDueDate || null,
          duration_months: Number(editDurationMonths) || 1,
          notes: editNotes.trim() || null,
        }),
      });

      if (res.ok) {
        toast.success('Actualizado correctamente');
        setSelectedLoanForEdit(null);
        refetchLoans();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al actualizar');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsUpdatingLoan(false);
    }
  };

  const isLentMode = loanTypeTab === 'LENT';

  return (
    <div className="min-h-screen bg-[#070F1E] flex flex-col pb-24">
      <Header user={user} onUserUpdate={invalidateFinance} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 py-5 space-y-4">
        {/* Top Header Banner */}
        <PageBanner
          icon={<HandCoins className="w-5 h-5" />}
          title={isLentMode ? 'Cartera de Préstamos por Cobrar' : 'Deudas y Créditos por Pagar'}
          description={
            isLentMode
              ? 'Gestiona el dinero que prestas, las cuotas de interés sobre saldo, fechas de cobro y el recaudo total del capital.'
              : 'Controla los préstamos que has adquirido con terceros o acreedores, los intereses a pagar y tus compromisos de amortización.'
          }
          badgeText={
            isLentMode
              ? `${summary.active_lent_count || 0} activos`
              : `${summary.active_borrowed_count || 0} activas`
          }
          actionText={isLentMode ? 'Nuevo Préstamo' : 'Nueva Deuda'}
          onAction={() => {
            resetNewLoanForm(loanTypeTab);
            setIsNewLoanOpen(true);
          }}
          theme={isLentMode ? 'cyan' : 'amber'}
        />

        {/* Direction Tabs: Por Cobrar (Me deben) vs Por Pagar (Yo debo) */}
        <div className="bg-[#0B192C] border border-[#1E3A5F] p-1 rounded-2xl grid grid-cols-2 gap-1 shadow-md">
          <button
            type="button"
            onClick={() => setLoanTypeTab('LENT')}
            className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isLentMode
                ? 'bg-linear-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] shadow-md shadow-[#00ADB5]/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Por Cobrar</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
              isLentMode ? 'bg-[#0B192C]/30 text-[#0B192C]' : 'bg-[#102A43] text-slate-300'
            }`}>
              {summary.active_lent_count || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setLoanTypeTab('BORROWED')}
            className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              !isLentMode
                ? 'bg-linear-to-r from-amber-500 to-rose-500 text-[#0B192C] shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Por Pagar</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
              !isLentMode ? 'bg-[#0B192C]/30 text-[#0B192C]' : 'bg-[#102A43] text-slate-300'
            }`}>
              {summary.active_borrowed_count || 0}
            </span>
          </button>
        </div>

        {/* 4 Executive KPI Cards (Dynamic according to mode) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1 */}
          <div className="bg-[#102A43] border border-[#1E3A5F] rounded-2xl p-3.5 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                {isLentMode ? 'Capital en Calle' : 'Capital por Amortizar'}
              </span>
              <div className="w-7 h-7 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                <HandCoins className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-base sm:text-xl font-black text-white font-mono">
                {formatCOP(summary.total_active_capital_lent)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {summary.active_loans_count} {summary.active_loans_count === 1 ? 'registro activo' : 'registros activos'}
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className={`bg-[#102A43] border rounded-2xl p-3.5 shadow-md flex flex-col justify-between ${
            isLentMode ? 'border-emerald-500/30' : 'border-cyan-500/30'
          }`}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                isLentMode ? 'text-emerald-400' : 'text-cyan-400'
              }`}>
                {isLentMode ? 'Interés Recogido' : 'Interés Pagado'}
              </span>
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                isLentMode ? 'bg-emerald-500/15 text-emerald-400' : 'bg-cyan-500/15 text-cyan-400'
              }`}>
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className={`text-base sm:text-xl font-black font-mono ${
                isLentMode ? 'text-emerald-400' : 'text-cyan-300'
              }`}>
                +{formatCOP(summary.total_interest_collected)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isLentMode ? 'Ganancia cobrada a la fecha' : 'Interés pagado a acreedores'}
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-[#102A43] border border-amber-500/30 rounded-2xl p-3.5 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] sm:text-xs font-bold text-amber-400 uppercase tracking-wider">
                {isLentMode ? 'Total a Recoger' : 'Total a Pagar'}
              </span>
              <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <CircleDollarSign className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-base sm:text-xl font-black text-amber-300 font-mono">
                {formatCOP(summary.total_expected_return || summary.total_balance_due)}
              </div>
              <p className="text-[10px] text-amber-400/80 mt-0.5">
                Capital + Ganancia • Resta: {formatCOP(summary.total_balance_due)}
              </p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-[#102A43] border border-purple-500/30 rounded-2xl p-3.5 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] sm:text-xs font-bold text-purple-300 uppercase tracking-wider">
                {isLentMode ? 'Ganancia Proyectada' : 'Costo Financiero'}
              </span>
              <div className="w-7 h-7 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                <BadgePercent className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-base sm:text-xl font-black text-purple-300 font-mono">
                +{formatCOP(summary.total_projected_interest || summary.total_expected_interest)}
              </div>
              <p className="text-[10px] text-purple-300/80 mt-0.5">
                +{formatCOP(summary.monthly_projected_interest || 0)}/mes en cuotas
              </p>
            </div>
          </div>
        </div>

        {/* Consolidated summary banner if multiple loans match search */}
        {debtorConsolidated && (
          <div className="bg-linear-to-r from-[#102A43] to-[#0B192C] border border-[#00ADB5]/50 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-[10px] font-bold text-[#00ADB5] uppercase tracking-wider block">
                Resumen Consolidado de {debtorConsolidated.name}
              </span>
              <span className="text-sm font-black text-white">
                {debtorConsolidated.count} acuerdos registrados
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono flex-wrap text-[11px]">
              <span className="text-slate-300">
                Capital: <strong className="text-white">{formatCOP(debtorConsolidated.totalCapital)}</strong>
              </span>
              <span>•</span>
              <span className="text-emerald-400">
                Ganancia Proyectada: <strong className="font-bold">+{formatCOP(debtorConsolidated.totalProjectedInt)}</strong>
              </span>
              <span>•</span>
              <span className="text-amber-300">
                Total a Recoger: <strong className="font-bold">{formatCOP(debtorConsolidated.totalDue)}</strong>
              </span>
              <span>•</span>
              <span className="text-cyan-300">
                Recogido: <strong className="font-bold">{formatCOP(debtorConsolidated.totalCollected)}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-[#0B192C] border border-[#1E3A5F] rounded-2xl p-2.5 shadow-md">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isLentMode ? "Buscar por deudor o teléfono..." : "Buscar por acreedor o entidad..."}
              className="w-full bg-[#102A43] border border-[#243B55] focus:border-[#00ADB5] rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-white placeholder-slate-400 outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-[#102A43] p-1 rounded-xl border border-[#243B55] shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-linear-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Activos
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PAID')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'PAID'
                  ? 'bg-linear-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pagados
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-linear-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({loans.length})
            </button>
          </div>
        </div>

        {/* Loans List */}
        {loadingLoans ? (
          <div className="text-center py-12">
            <div className="w-9 h-9 border-3 border-[#00ADB5]/30 border-t-[#00ADB5] rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 mt-2 font-semibold tracking-wider uppercase">
              Cargando...
            </p>
          </div>
        ) : loans.length === 0 ? (
          <div className="bg-[#0B192C] border border-[#1E3A5F] rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#00ADB5]/15 border border-[#00ADB5]/30 flex items-center justify-center mx-auto mb-3 text-[#00ADB5]">
              <HandCoins className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white">
              {isLentMode ? 'No hay préstamos por cobrar' : 'No hay deudas por pagar'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {search
                ? `Sin resultados para "${search}".`
                : isLentMode
                ? 'Registra préstamos que otorgues para controlar tu cartera y cobros de intereses.'
                : 'Registra préstamos que recibas para llevar el control de tus deudas y pagos.'}
            </p>
            <button
              onClick={() => {
                resetNewLoanForm(loanTypeTab);
                setIsNewLoanOpen(true);
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-linear-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] font-black text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3px]" />
              <span>{isLentMode ? 'Registrar Préstamo' : 'Registrar Deuda'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Top Toolbar: Debtor Count & Expand/Collapse All */}
            <div className="flex items-center justify-between gap-2 px-1 text-xs">
              <span className="text-slate-400 font-semibold">
                {totalDebtors} {totalDebtors === 1 ? (isLentMode ? 'persona con préstamos' : 'acreedor con deudas') : (isLentMode ? 'personas con préstamos' : 'acreedores con deudas')}
              </span>
              <button
                type="button"
                onClick={toggleAllCurrentPage}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors select-none"
              >
                {isAllExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Plegar todos</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Desplegar todos</span>
                  </>
                )}
              </button>
            </div>

            {paginatedDebtors.map((debtor: any) => {
              const debtorKey = (debtor.borrower_name || 'sin_nombre').trim().toLowerCase();
              const isDebtorExpanded = expandedDebtorKeys.has(debtorKey);
              const isAllPaid = debtor.all_paid;
              const isOverdue = debtor.has_overdue;
              const hasPhone = Boolean(debtor.borrower_phone);
              const isMultiLoan = debtor.loans.length > 1;

              return (
                <div
                  key={debtor.borrower_name}
                  className={`bg-[#0B192C] border rounded-3xl overflow-hidden shadow-xl transition-all ${
                    isAllPaid
                      ? 'border-slate-800 opacity-90'
                      : isOverdue
                      ? 'border-rose-500/40'
                      : 'border-[#1E3A5F] hover:border-[#00ADB5]/50'
                  }`}
                >
                  {/* Debtor Header Banner */}
                  <div className="p-3.5 sm:p-4 bg-linear-to-r from-[#0B192C] via-[#102A43] to-[#0B192C] border-b border-[#1E3A5F] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Identity & Status */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                          {debtor.borrower_name}
                        </h2>
                        {isAllPaid ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 uppercase">
                            Liquidado
                          </span>
                        ) : isOverdue ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-950/70 border border-rose-500/40 text-rose-300 uppercase flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Vencido
                          </span>
                        ) : (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 uppercase">
                            Activo
                          </span>
                        )}

                        {isMultiLoan && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-950/70 border border-purple-500/40 text-purple-300">
                            {debtor.loans.length} {isLentMode ? 'Préstamos' : 'Deudas'}
                          </span>
                        )}
                      </div>

                      <div className="text-left text-[10px]">
                        <div className="flex items-center sm:justify-end gap-2 uppercase font-bold tracking-wider">
                          <span className="text-slate-400">Capital: <strong className="text-white font-mono">{formatCOP(debtor.total_remaining_capital)}</strong></span>
                          {debtor.total_projected_interest > 0 && (
                            <span className="text-emerald-400 font-mono">• Int: +{formatCOP(debtor.total_projected_interest)}</span>
                          )}
                          <div className="flex items-baseline sm:justify-end gap-1.5 mt-0.5">
                            <span className="uppercase font-bold text-amber-400">
                              {isLentMode ? 'Total:' : 'Total:'}
                            </span>
                            <span className={`font-black font-mono ${
                              isAllPaid ? 'text-emerald-400' : 'text-amber-300'
                            }`}>
                              {formatCOP(debtor.total_to_collect)}
                            </span>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Recogido: <strong className="text-emerald-400">{formatCOP(debtor.total_collected)}</strong>
                          <span className="mx-1">•</span>
                          Resta: <strong className="text-slate-200">{formatCOP(debtor.total_remaining_to_collect)}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-400 mt-1.5 flex-wrap">
                        {hasPhone && (
                          <a
                            href={`https://wa.me/57${debtor.borrower_phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                              `Hola ${debtor.borrower_name}, te escribo con respecto a tu saldo total pendiente de ${formatCOP(debtor.total_remaining_to_collect || debtor.total_current_balance)}.`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-400 hover:underline font-semibold mr-1"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>{debtor.borrower_phone}</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Consolidated Balance & + Préstamo Action */}
                    <div className="flex flex-col items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1E3A5F]/50">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenNewLoanForDebtor(debtor.loans[0])}
                          className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] hover:border-[#00ADB5] text-cyan-300 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm select-none"
                          title={isLentMode ? `Prestar más a ${debtor.borrower_name}` : `Registrar otra deuda con ${debtor.borrower_name}`}
                        >
                          <Plus className="w-3.5 h-3.5 text-[#00ADB5]" />
                          <span>{isLentMode ? 'Préstamo' : 'Deuda'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleDebtor(debtorKey)}
                          className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm select-none ${
                            isDebtorExpanded
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
                              : 'bg-linear-to-r from-[#00ADB5]/20 to-[#06B6D4]/20 border border-[#00ADB5]/40 text-[#00ADB5] hover:text-white hover:border-[#00ADB5]'
                          }`}
                          title={isDebtorExpanded ? 'Plegar lista de acuerdos' : 'Desplegar lista de acuerdos para ver abonos'}
                        >
                          <span>{isDebtorExpanded ? 'Plegar' : (isLentMode ? 'Ver Préstamos' : 'Ver Deudas')}</span>
                          {isDebtorExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-[#00ADB5]" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sub-loans / Acuerdos List inside the person container - Only rendered when expanded! */}
                  {isDebtorExpanded && (
                    <div className="divide-y divide-[#1E3A5F]/60 animate-in fade-in duration-150">
                    {debtor.loans.map((loan: any, loanIndex: number) => {
                      const isLoanPaid = loan.status === 'PAID';
                      const isLoanExpanded = expandedLoanId === loan.id;
                      const isLoanOverdue =
                        !isLoanPaid &&
                        loan.due_date &&
                        new Date(loan.due_date).getTime() < new Date().setHours(0, 0, 0, 0);

                      return (
                        <div key={loan.id} className="p-3.5 sm:p-4 space-y-3">
                          {/* Loan Sub-header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {loan.notes && (
                                  <span className="text-xs text-cyan-300/90 font-medium italic truncate max-w-xs">
                                    "{loan.notes}"
                                  </span>
                                )}
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#102A43] border border-cyan-500/30 text-cyan-300 font-mono">
                                  Plazo: {loan.duration_months || 1} {Number(loan.duration_months) === 1 ? 'mes' : 'meses'}
                                </span>
                                {isLoanPaid ? (
                                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-950/70 text-emerald-300 uppercase">
                                    Liquidado
                                  </span>
                                ) : isLoanOverdue ? (
                                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-950/70 text-rose-300 uppercase flex items-center gap-1">
                                    <AlertCircle className="w-2.5 h-2.5" />
                                    Vencido
                                  </span>
                                ) : null}
                              </div>

                              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span>{formatShortDateSpanish(loan.start_date)}</span>
                                </span>
                                {loan.due_date && (
                                  <span className={`flex items-center gap-1 ${isLoanOverdue ? 'text-rose-400 font-bold' : ''}`}>
                                    <Clock className="w-3 h-3" />
                                    <span>Vence: {formatShortDateSpanish(loan.due_date)}</span>
                                  </span>
                                )}
                                <span className="text-slate-400">
                                  Medio: <strong className="text-slate-300">{loan.payment_method || 'Efectivo'}</strong>
                                </span>
                              </div>
                            </div>

                            {/* Sub-loan Action Buttons */}
                            <div className="flex items-center w-full gap-1.5 self-end sm:self-center shrink-0">
                              {!isLoanPaid && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPayment(loan)}
                                  className="px-3 py-1.5 w-full justify-center sm:w-fit rounded-xl bg-linear-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] font-black text-xs shadow-md shadow-[#00ADB5]/20 flex items-center gap-1 cursor-pointer"
                                >
                                  <DollarSign className="w-3.5 h-3.5 stroke-[2.5px]" />
                                  <span>{isLentMode ? 'Abonar' : 'Pagar'}</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setExpandedLoanId(isLoanExpanded ? null : loan.id)}
                                className="p-1.5 px-2 rounded-xl bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                                title="Auditoría de abonos"
                              >
                                <Receipt className="w-3.5 h-3.5 text-[#00ADB5]" />
                                <span className="font-mono text-[11px]">{loan.payment_count || 0}</span>
                                {isLoanExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEdit(loan)}
                                className="p-1.5 rounded-xl bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] text-slate-400 hover:text-cyan-400 cursor-pointer"
                                title="Editar"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteLoan(loan.id, loan.borrower_name)}
                                className="p-1.5 rounded-xl bg-[#102A43] hover:bg-rose-500/20 border border-[#243B55] text-slate-400 hover:text-rose-400 cursor-pointer"
                                title="Eliminar este acuerdo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="pt-1">
                            <div className="flex items-center justify-between text-[11px] mb-1 flex-wrap gap-1">
                              <span className="text-slate-300 font-mono">
                                Recogido: <span className="text-emerald-400 font-bold">{formatCOP(loan.total_collected)}</span> /{' '}
                                <span className="text-amber-300 font-bold">{formatCOP(loan.total_to_collect)}</span>
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-[#102A43] rounded-full overflow-hidden border border-[#243B55]/50">
                              <div
                                className="h-full rounded-full bg-linear-to-r from-[#00ADB5] to-emerald-400 transition-all duration-500"
                                style={{ width: `${Math.min(100, loan.progress_percentage || 0)}%` }}
                              />
                            </div>
                          </div>

                          {/* 4-Metric Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div className="bg-[#102A43]/50 border border-[#1E3A5F]/60 rounded-xl p-2.5 shadow-sm">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                {isLentMode ? 'Capital Prestado' : 'Capital Recibido'}
                              </span>
                              <span className="text-xs sm:text-sm font-black text-white font-mono mt-0.5 block">
                                {formatCOP(loan.initial_amount)}
                              </span>
                              <span className="text-[9px] text-cyan-300/80 truncate block font-mono">
                                Amortizado: {formatCOP(loan.paid_capital)}
                              </span>
                            </div>

                            <div className="bg-[#102A43]/50 border border-emerald-500/20 rounded-xl p-2.5 shadow-sm">
                              <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                                {isLentMode ? 'Ganancia Proyectada' : 'Interés Proyectado'}
                              </span>
                              <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono mt-0.5 block">
                                +{formatCOP(loan.projected_interest)}
                              </span>
                              <span className="text-[9px] text-emerald-300/80 truncate block font-mono">
                                Recogido: {formatCOP(loan.paid_interest)}
                              </span>
                            </div>

                            <div className="bg-[#102A43]/50 border border-amber-500/30 rounded-xl p-2.5 shadow-sm">
                              <span className="text-[10px] uppercase font-bold text-amber-400 block">
                                {isLentMode ? 'Total a Recoger' : 'Total a Pagar'}
                              </span>
                              <span className="text-xs sm:text-sm font-black text-amber-300 font-mono mt-0.5 block">
                                {formatCOP(loan.total_to_collect)}
                              </span>
                              <span className="text-[9px] text-amber-400/80 truncate block font-mono">
                                Resta: {formatCOP(loan.remaining_to_collect)}
                              </span>
                            </div>

                            <div className="bg-[#0B192C]/70 border border-[#1E3A5F]/60 rounded-xl p-2.5 shadow-sm">
                              <span className="text-[10px] uppercase font-bold text-slate-300 block">
                                {isLentMode ? 'Capital por Cobrar' : 'Capital por Pagar'}
                              </span>
                              <span className={`text-xs sm:text-sm font-black font-mono mt-0.5 block ${
                                isLoanPaid ? 'text-emerald-400' : 'text-slate-200'
                              }`}>
                                {formatCOP(loan.remaining_capital)}
                              </span>
                              <span className="text-[9px] text-slate-400 truncate block font-mono">
                                {isLoanPaid ? 'Liquidado' : 'Deuda principal'}
                              </span>
                            </div>
                          </div>

                          {/* Expandable Payment History */}
                          {isLoanExpanded && (
                            <div className="p-3 bg-[#070F1E] border border-[#1E3A5F] rounded-xl space-y-2 mt-2">
                              <h4 className="text-[11px] font-black text-white uppercase tracking-wider">
                                Historial de Abonos ({loan.payments?.length || 0})
                              </h4>
                             

                              {(!loan.payments || loan.payments.length === 0) ? (
                                <p className="text-center py-4 text-xs text-slate-400">
                                  Sin abonos registrados todavía.
                                </p>
                              ) : (
                                <div className="space-y-1.5">
                                  {loan.payments.map((p: any) => (
                                    <div
                                      key={p.id}
                                      className="bg-[#102A43] border border-[#243B55] rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs"
                                    >
                                      <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-bold text-white font-mono">
                                            +{formatCOP(p.total_amount)}
                                          </span>
                                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0B192C] border border-[#243B55] text-slate-300">
                                            {p.payment_method || 'Cuenta'}
                                          </span>
                                          <span className="text-[10px] text-slate-400">
                                            {formatShortDateSpanish(p.payment_date)}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-slate-300 mt-0.5">
                                          <span>Cap: <strong className="text-cyan-300 font-mono">+{formatCOP(p.capital_amount)}</strong></span>
                                          <span className="mx-1">•</span>
                                          <span>Int: <strong className="text-emerald-300 font-mono">+{formatCOP(p.interest_amount)}</strong></span>
                                          {p.notes && <span className="text-slate-400 italic ml-1">({p.notes})</span>}
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handleDeletePayment(loan.id, p.id)}
                                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                        title="Revertir abono"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

            {/* Pagination Component */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalDebtors}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
              label={isLentMode ? 'deudores' : 'acreedores'}
            />
          </div>
        )}
      </main>

      {/* MODAL 1: REGISTRAR PRÉSTAMO O DEUDA */}
      {isNewLoanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-[#0B192C] border border-[#1E3A5F] rounded-3xl p-5 shadow-2xl relative my-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E3A5F] mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#00ADB5]/20 text-[#00ADB5] flex items-center justify-center">
                  <HandCoins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {newLoanType === 'LENT' ? 'Nuevo Préstamo por Cobrar' : 'Nueva Deuda por Pagar'}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {newLoanType === 'LENT' ? 'Dinero que tú prestas' : 'Dinero que te prestan a ti'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsNewLoanOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Type selector toggle inside modal */}
            <div className="grid grid-cols-2 gap-1 bg-[#102A43] p-1 rounded-xl border border-[#243B55] mb-3">
              <button
                type="button"
                onClick={() => setNewLoanType('LENT')}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                  newLoanType === 'LENT'
                    ? 'bg-[#00ADB5] text-[#0B192C]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Por Cobrar
              </button>
              <button
                type="button"
                onClick={() => setNewLoanType('BORROWED')}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                  newLoanType === 'BORROWED'
                    ? 'bg-amber-500 text-[#0B192C]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Por Pagar
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {newLoanType === 'LENT' ? 'Nombre del Deudor *' : 'Nombre del Acreedor / Prestamista *'}
                </label>
                <input
                  type="text"
                  required
                  value={newBorrowerName}
                  onChange={(e) => setNewBorrowerName(e.target.value)}
                  placeholder={newLoanType === 'LENT' ? 'Ej: Carlos Gómez' : 'Ej: Banco, Prestamista Don Pedro'}
                  className="w-full bg-[#102A43] border border-[#243B55] focus:border-[#00ADB5] rounded-xl px-3 py-2 text-sm text-white placeholder-slate-400 outline-none"
                />
                {existingContacts.length > 0 && !newBorrowerName && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    <span className="text-[10px] text-slate-400">Existentes:</span>
                    {existingContacts.slice(0, 5).map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => {
                          setNewBorrowerName(c.name);
                          if (c.phone) setNewBorrowerPhone(c.phone);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-[#0B192C] hover:bg-[#152E4D] border border-[#243B55] text-cyan-300 transition-colors cursor-pointer"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Teléfono / WhatsApp (Opcional)
                </label>
                <input
                  type="tel"
                  value={newBorrowerPhone}
                  onChange={(e) => setNewBorrowerPhone(e.target.value)}
                  placeholder="Ej: 3101234567"
                  className="w-full bg-[#102A43] border border-[#243B55] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Capital Prestado ($ COP) *
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  step="500"
                  value={newInitialAmount}
                  onChange={(e) => setNewInitialAmount(e.target.value)}
                  placeholder="Ej: 500000"
                  className="w-full bg-[#102A43] border border-[#243B55] focus:border-[#00ADB5] rounded-xl px-3 py-2 text-sm font-mono font-bold text-white outline-none"
                />
              </div>

              {/* Interest calculation */}
              <div className="bg-[#102A43] border border-[#243B55] rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-300 block">
                      Interés Mensual
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Se aplica cada mes sobre el capital adeudado
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setInterestType('PERCENT')}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                        interestType === 'PERCENT' ? 'bg-[#00ADB5] text-[#0B192C]' : 'text-slate-400'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setInterestType('FIXED')}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                        interestType === 'FIXED' ? 'bg-[#00ADB5] text-[#0B192C]' : 'text-slate-400'
                      }`}
                    >
                      $ Fijo
                    </button>
                  </div>
                </div>

                {interestType === 'PERCENT' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={newInterestRate}
                      onChange={(e) => setNewInterestRate(e.target.value)}
                      placeholder="10"
                      className="w-full bg-[#0B192C] border border-[#243B55] rounded-lg px-2.5 py-1 text-xs font-mono text-white outline-none"
                    />
                    <span className="text-xs text-slate-300 font-bold whitespace-nowrap">% mensual</span>
                  </div>
                ) : (
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={newFixedInterest}
                    onChange={(e) => setNewFixedInterest(e.target.value)}
                    placeholder="Monto fijo mensual en COP"
                    className="w-full bg-[#0B192C] border border-[#243B55] rounded-lg px-2.5 py-1 text-xs font-mono text-white outline-none"
                  />
                )}

                <div className="pt-2 border-t border-[#243B55] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Cuota mensual de interés:</span>
                    <span className="text-cyan-300 font-mono font-bold">
                      +{formatCOP(calculatedNewInterest)}/mes
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-300">Ganancia proyectada ({newDurationMonths || 1} {Number(newDurationMonths) === 1 ? 'mes' : 'meses'}):</span>
                    <span className="text-emerald-300 font-mono">
                      +{formatCOP(calculatedProjectedInterest)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-bold pt-1 border-t border-[#243B55]/60">
                    <span className="text-amber-400">Total a recoger (Cap + Int):</span>
                    <span className="text-amber-300 font-mono text-sm">
                      {formatCOP(calculatedNewTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Capital base a liquidar:</span>
                    <span className="text-white font-mono font-bold">
                      {formatCOP(Number(newInitialAmount) || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Plazo & Dates */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Plazo Estimado (Meses)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={newDurationMonths}
                    onChange={(e) => {
                      const m = e.target.value;
                      setNewDurationMonths(m);
                      if (newStartDate && Number(m) > 0) {
                        const d = new Date(newStartDate);
                        d.setMonth(d.getMonth() + Number(m));
                        setNewDueDate(d.toISOString().split('T')[0]);
                      }
                    }}
                    placeholder="1"
                    className="w-full bg-[#102A43] border border-[#243B55] focus:border-[#00ADB5] rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Fecha Límite / Vence
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] rounded-xl px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Fecha Inicio *
                </label>
                <input
                  type="date"
                  required
                  value={newStartDate}
                  onChange={(e) => {
                    const start = e.target.value;
                    setNewStartDate(start);
                    if (start && Number(newDurationMonths) > 0) {
                      const d = new Date(start);
                      d.setMonth(d.getMonth() + Number(newDurationMonths));
                      setNewDueDate(d.toISOString().split('T')[0]);
                    }
                  }}
                  className="w-full bg-[#102A43] border border-[#243B55] rounded-xl px-2.5 py-1.5 text-xs text-white outline-none"
                />
              </div>

              {/* Account */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {newLoanType === 'LENT' ? 'Cuenta de Desembolso (-saldo)' : 'Cuenta Receptora (+saldo)'}
                </label>
                <select
                  value={newPaymentMethod}
                  onChange={(e) => setNewPaymentMethod(e.target.value)}
                  className="w-full bg-[#102A43] border border-[#243B55] rounded-xl px-2.5 py-1.5 text-xs text-white outline-none"
                >
                  {paymentMethods.map((pm: any) => (
                    <option key={pm.id} value={pm.name}>
                      {pm.name}
                    </option>
                  ))}
                  {paymentMethods.length === 0 && <option value="Efectivo">Efectivo</option>}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notas / Condiciones
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Ej: 4 cuotas mensuales, sin interés, etc."
                  className="w-full bg-[#102A43] border border-[#243B55] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-400 outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewLoanOpen(false)}
                  className="px-3 py-2 rounded-xl bg-[#102A43] hover:bg-[#152E4D] text-xs font-bold text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingLoan}
                  className="px-4 py-2 rounded-xl bg-[#00ADB5] hover:bg-[#06B6D4] text-[#0B192C] font-black text-xs disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingLoan ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR ABONO */}
      {selectedLoanForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-[#0B192C] border border-[#1E3A5F] rounded-3xl p-5 shadow-2xl relative my-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E3A5F] mb-3">
              <div>
                <h3 className="text-base font-black text-white">
                  {selectedLoanForPayment.loan_type === 'BORROWED' ? 'Registrar Pago de Deuda' : 'Registrar Abono'}
                </h3>
                <span className="text-xs text-[#00ADB5] font-semibold">
                  {selectedLoanForPayment.borrower_name}
                </span>
              </div>
              <button
                onClick={() => setSelectedLoanForPayment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Debt Box */}
            {(() => {
              const remCap = Number(selectedLoanForPayment.remaining_capital) || Number(selectedLoanForPayment.current_balance) || 0;
              const monthlyFee =
                selectedLoanForPayment.monthly_interest ||
                (selectedLoanForPayment.interest_rate > 0
                  ? Math.round(remCap * (selectedLoanForPayment.interest_rate / 100))
                  : Number(selectedLoanForPayment.expected_interest) || 0);

              return (
                <>
                  <div className="bg-[#102A43] border border-[#243B55] rounded-xl p-3 mb-3 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-300">
                      <span>Capital adeudado (Deuda actual):</span>
                      <span className="font-mono font-bold text-white">{formatCOP(remCap)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Cobro de interés del mes ({selectedLoanForPayment.interest_rate > 0 ? `${selectedLoanForPayment.interest_rate}%` : 'fijo'}):</span>
                      <span className="font-mono font-bold text-emerald-400">+{formatCOP(monthlyFee)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-1 border-t border-[#243B55] text-amber-300">
                      <span>Total para liquidar todo hoy:</span>
                      <span className="font-mono">{formatCOP(remCap + monthlyFee)}</span>
                    </div>
                  </div>

                  {/* Shortcuts */}
                  <div className="flex items-center gap-1.5 mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPayCapital('');
                        setPayInterest(String(monthlyFee > 0 ? monthlyFee : ''));
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-[#102A43] border border-[#243B55] text-[11px] font-bold text-emerald-300 hover:bg-[#152E4D] cursor-pointer"
                      title="Cobra únicamente el interés del mes sin reducir la deuda de capital"
                    >
                      Solo Interés ({formatCOP(monthlyFee)})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPayCapital(String(remCap));
                        setPayInterest(String(monthlyFee > 0 ? monthlyFee : ''));
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-[#102A43] border border-[#243B55] text-[11px] font-bold text-cyan-300 hover:bg-[#152E4D] cursor-pointer"
                      title="Paga todo el capital restante más el interés del mes para liquidar"
                    >
                      Saldar Préstamo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const half = Math.round(remCap / 2);
                        setPayCapital(String(half));
                        setPayInterest(String(monthlyFee > 0 ? monthlyFee : ''));
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-[#102A43] border border-[#243B55] text-[11px] font-bold text-slate-300 hover:bg-[#152E4D] cursor-pointer"
                      title="Abona el 50% del capital adeudado más el interés del mes"
                    >
                      50% Capital
                    </button>
                  </div>
                </>
              );
            })()}

            <form onSubmit={handleSubmitPayment} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-cyan-300 mb-1">
                    Abono a Capital ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={payCapital}
                    onChange={(e) => setPayCapital(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#102A43] border border-[#243B55] rounded-xl px-2.5 py-1.5 text-xs font-mono text-white outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Reduce deuda de capital</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-300 mb-1">
                    Interés del Mes ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={payInterest}
                    onChange={(e) => setPayInterest(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#102A43] border border-[#243B55] rounded-xl px-2.5 py-1.5 text-xs font-mono text-white outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Ganancia/cobro del mes</span>
                </div>
              </div>

              <div className="bg-[#102A43] border border-[#00ADB5]/40 rounded-xl p-2.5 flex justify-between items-center text-xs">
                <span className="font-semibold text-white">Total Movimiento:</span>
                <span className="font-mono font-black text-sm text-[#00ADB5]">{formatCOP(calculatedTotalPayment)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {selectedLoanForPayment.loan_type === 'BORROWED' ? 'Cuenta de Pago (-)' : 'Cuenta Receptora (+)'}
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] rounded-xl px-2 py-1.5 text-xs text-white outline-none"
                  >
                    {paymentMethods.map((pm: any) => (
                      <option key={pm.id} value={pm.name}>{pm.name}</option>
                    ))}
                    {paymentMethods.length === 0 && <option value="Nequi">Nequi</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Fecha del Abono
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] rounded-xl px-2 py-1.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Notas / Comprobante
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Ej: Transferencia #4892"
                  className="w-full bg-[#102A43] border border-[#243B55] rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-400 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedLoanForPayment(null)}
                  className="px-3 py-1.5 rounded-xl bg-[#102A43] text-xs font-bold text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment || calculatedTotalPayment <= 0}
                  className="px-4 py-2 rounded-xl bg-linear-to-r from-emerald-500 to-teal-500 text-[#0B192C] font-black text-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingPayment ? 'Registrando...' : `Abonar ${formatCOP(calculatedTotalPayment)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDITAR REGISTRO */}
      {selectedLoanForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-[#0B192C] border border-[#1E3A5F] rounded-3xl p-5 shadow-2xl relative my-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E3A5F] mb-3">
              <h3 className="text-base font-black text-white">Editar Información</h3>
              <button
                onClick={() => setSelectedLoanForEdit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#102A43] border border-[#243B55] rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-[#102A43] border border-[#243B55] rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Plazo (Meses)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editDurationMonths}
                    onChange={(e) => setEditDurationMonths(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] rounded-xl px-3 py-1.5 text-xs text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Fecha Límite</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full bg-[#102A43] border border-[#243B55] rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notas</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-[#102A43] border border-[#243B55] rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedLoanForEdit(null)}
                  className="px-3 py-1.5 rounded-xl bg-[#102A43] text-xs font-bold text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingLoan}
                  className="px-4 py-2 rounded-xl bg-[#00ADB5] text-[#0B192C] font-black text-xs"
                >
                  {isUpdatingLoan ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Navigation with Metas restored */}
      <BottomNav
        onOpenQuickExpense={() => setIsQuickExpenseOpen(true)}
        userRole={user?.role}
      />

      <QuickExpenseModal
        isOpen={isQuickExpenseOpen}
        onClose={() => setIsQuickExpenseOpen(false)}
        onExpenseAdded={invalidateFinance}
        categories={categories}
      />
    </div>
  );
}
