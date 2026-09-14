'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  CircleDollarSign, 
  TrendingUp, 
  Calendar, 
  Clock, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Edit3, 
  DollarSign, 
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Edit2,
  Edit,
  ListCheck
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
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [loanModalMode, setLoanModalMode] = useState<'create' | 'edit'>('create');
  const [selectedLoanForEdit, setSelectedLoanForEdit] = useState<any | null>(null);

  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<any | null>(null);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);

  // Unified Loan Form State (Creation & Full Editing)
  const [formLoanType, setFormLoanType] = useState<'LENT' | 'BORROWED'>('LENT');
  const [formBorrowerName, setFormBorrowerName] = useState('');
  const [formInitialAmount, setFormInitialAmount] = useState('');
  const [formDurationMonths, setFormDurationMonths] = useState('1');
  const [formInterestType, setFormInterestType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [formInterestRate, setFormInterestRate] = useState('10');
  const [formFixedInterest, setFormFixedInterest] = useState('');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDueDate, setFormDueDate] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [isSavingLoan, setIsSavingLoan] = useState(false);

  // Payment Form State
  const [payCapital, setPayCapital] = useState('');
  const [payInterest, setPayInterest] = useState('');
  const [payMethod, setPayMethod] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Group loans by debtor (borrower_name)
  const groupedDebtors = useMemo(() => {
    const map = new Map<string, {
      borrower_name: string;
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
      }
    });

    return Array.from(map.values());
  }, [loans]);

  // Pagination & Debtor Collapsing State
  const ITEMS_PER_PAGE = 8;
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

  // Calculated Preview for Loan Form
  const calculatedFormInterest = useMemo(() => {
    const principal = Number(formInitialAmount) || 0;
    if (principal <= 0) return 0;
    if (formInterestType === 'PERCENT') {
      const rate = Number(formInterestRate) || 0;
      return Math.round(principal * (rate / 100));
    } else {
      return Number(formFixedInterest) || 0;
    }
  }, [formInitialAmount, formInterestType, formInterestRate, formFixedInterest]);

  const calculatedFormProjectedInterest = useMemo(() => {
    const months = Number(formDurationMonths) || 1;
    return calculatedFormInterest * months;
  }, [calculatedFormInterest, formDurationMonths]);

  const calculatedFormTotal = (Number(formInitialAmount) || 0) + calculatedFormProjectedInterest;
  const calculatedTotalPayment = (Number(payCapital) || 0) + (Number(payInterest) || 0);

  // Unique contacts list from loans for quick auto-fill
  const existingContacts = useMemo(() => {
    const names = new Set<string>();
    loans.forEach((l: any) => {
      if (l.borrower_name) names.add(l.borrower_name);
    });
    return Array.from(names);
  }, [loans]);

  // Open Create Loan Modal
  const handleOpenCreateLoan = (presetType?: 'LENT' | 'BORROWED', prefillDebtor?: string) => {
    setLoanModalMode('create');
    setSelectedLoanForEdit(null);
    setFormLoanType(presetType || loanTypeTab);
    setFormBorrowerName(prefillDebtor || '');
    setFormInitialAmount('');
    setFormDurationMonths('1');
    setFormInterestType('PERCENT');
    setFormInterestRate('10');
    setFormFixedInterest('');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormDueDate('');
    setFormPaymentMethod(paymentMethods[0]?.name || 'Efectivo');
    setFormNotes(prefillDebtor ? `Préstamo adicional` : '');
    setIsLoanModalOpen(true);
  };

  // Open Edit Loan Modal (with all fields loaded)
  const handleOpenEditLoan = (loan: any) => {
    setLoanModalMode('edit');
    setSelectedLoanForEdit(loan);
    setFormLoanType(loan.loan_type || 'LENT');
    setFormBorrowerName(loan.borrower_name || '');
    setFormInitialAmount(String(loan.initial_amount || ''));
    setFormDurationMonths(String(loan.duration_months || 1));
    if (Number(loan.interest_rate) > 0) {
      setFormInterestType('PERCENT');
      setFormInterestRate(String(loan.interest_rate));
      setFormFixedInterest('');
    } else {
      setFormInterestType('FIXED');
      setFormFixedInterest(String(loan.expected_interest || ''));
      setFormInterestRate('0');
    }
    setFormStartDate(loan.start_date || new Date().toISOString().split('T')[0]);
    setFormDueDate(loan.due_date || '');
    setFormPaymentMethod(loan.payment_method || paymentMethods[0]?.name || 'Efectivo');
    setFormNotes(loan.notes || '');
    setIsLoanModalOpen(true);
  };

  // Handle Save Loan (Create or Edit)
  const handleSaveLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBorrowerName.trim()) {
      toast.error('Ingresa el nombre de la persona o acreedor');
      return;
    }
    const principal = Number(formInitialAmount);
    if (isNaN(principal) || principal <= 0) {
      toast.error('El capital debe ser mayor a 0');
      return;
    }

    setIsSavingLoan(true);
    try {
      const isEditing = loanModalMode === 'edit' && selectedLoanForEdit;
      const url = isEditing ? `/api/loans/${selectedLoanForEdit.id}` : '/api/loans';
      const method = isEditing ? 'PUT' : 'POST';

      const payload = {
        loan_type: formLoanType,
        borrower_name: formBorrowerName.trim(),
        initial_amount: principal,
        duration_months: Math.max(1, Number(formDurationMonths) || 1),
        interest_rate: formInterestType === 'PERCENT' ? Number(formInterestRate) || 0 : 0,
        expected_interest: calculatedFormInterest,
        start_date: formStartDate,
        due_date: formDueDate || null,
        payment_method: formPaymentMethod || paymentMethods[0]?.name || 'Efectivo',
        notes: formNotes.trim() || null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        const savedName = formBorrowerName.trim();
        toast.success(
          isEditing
            ? 'Préstamo actualizado correctamente'
            : (formLoanType === 'BORROWED'
                ? `Deuda con ${savedName} registrada`
                : `Préstamo a ${savedName} registrado`)
        );
        setIsLoanModalOpen(false);
        refetchLoans();
        invalidateFinance();
        if (savedName) {
          setExpandedDebtorKeys(prev => new Set(prev).add(savedName.toLowerCase()));
        }
      } else {
        toast.error(data.error || 'Error al guardar préstamo');
      }
    } catch {
      toast.error('Error de conexión');
    } finally {
      setIsSavingLoan(false);
    }
  };

  // Open Payment Modal
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
    if (!confirm('¿Revertir este abono? El balance de tu cuenta se actualizará de inmediato.')) {
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

  // Delete Entire Loan & Refund Capital
  const handleDeleteLoan = async (loanId: string, name: string) => {
    if (!confirm(`¿Eliminar definitivamente este acuerdo con "${name}"? El capital desembolsado se devolverá automáticamente a tu cuenta.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/loans/${loanId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Préstamo eliminado y saldo reintegrado`);
        refetchLoans();
        invalidateFinance();
      } else {
        toast.error(data.error || 'Error al eliminar');
      }
    } catch {
      toast.error('Error de conexión');
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
              ? 'Controla los préstamos otorgados, los rendimientos cobrados y el reintegro puntual del capital.'
              : 'Administra tus compromisos con terceros, cuotas de amortización e intereses devengados.'
          }
          badgeText={
            isLentMode
              ? `${summary.active_lent_count || 0} activos`
              : `${summary.active_borrowed_count || 0} activas`
          }
          actionText={isLentMode ? 'Nuevo Préstamo' : 'Nueva Deuda'}
          onAction={() => handleOpenCreateLoan(loanTypeTab)}
          theme={isLentMode ? 'cyan' : 'amber'}
        />

        {/* Direction Tabs: Por Cobrar vs Por Pagar */}
        <div className="bg-[#0B192C] border border-[#1E3A5F]/70 p-1 rounded-2xl grid grid-cols-2 gap-1 shadow-md">
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

        {/* 4 Minimalist Executive KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="bg-[#0B192C] border border-[#1E3A5F]/70 rounded-2xl p-3 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {isLentMode ? 'Capital Pendiente' : 'Capital por Pagar'}
              </span>
              <HandCoins className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base lg:text-lg font-black text-white font-mono truncate">
                {formatCOP(summary.total_active_capital_lent)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                {summary.active_loans_count} {summary.active_loans_count === 1 ? 'activo' : 'activos'}
              </p>
            </div>
          </div>

          <div className="bg-[#0B192C] border border-emerald-500/30 rounded-2xl p-3 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider truncate">
                {isLentMode ? 'Interés Recogido' : 'Interés Pagado'}
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base lg:text-lg font-black text-emerald-400 font-mono truncate">
                {formatCOP(summary.total_interest_collected)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                {isLentMode ? 'Ganancia cobrada' : 'Interés abonado'}
              </p>
            </div>
          </div>

          <div className="bg-[#0B192C] border border-amber-500/30 rounded-2xl p-3 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider truncate">
                {isLentMode ? 'Total a Recoger' : 'Total a Pagar'}
              </span>
              <CircleDollarSign className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base lg:text-lg font-black text-amber-300 font-mono truncate">
                {formatCOP(summary.total_expected_return || summary.total_balance_due)}
              </div>
              <p className="text-[10px] text-amber-400/80 mt-0.5 truncate">
                Capital + Ganancia
              </p>
            </div>
          </div>

          <div className="bg-[#0B192C] border border-purple-500/30 rounded-2xl p-3 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider truncate">
                {isLentMode ? 'Ganancia Proyectada' : 'Costo Financiero'}
              </span>
              <BadgePercent className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base lg:text-lg font-black text-purple-300 font-mono truncate">
                +{formatCOP(summary.total_projected_interest || summary.total_expected_interest)}
              </div>
              <p className="text-[10px] text-purple-300/80 mt-0.5 truncate">
                +{formatCOP(summary.monthly_projected_interest || 0)}/mes
              </p>
            </div>
          </div>
        </div>

        {/* Minimalist Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-[#0B192C] border border-[#1E3A5F]/70 rounded-2xl p-2 shadow-sm">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isLentMode ? "Buscar por persona o nota..." : "Buscar por acreedor o entidad..."}
              className="w-full bg-[#102A43] border border-[#243B55] focus:border-[#00ADB5] rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-400 outline-none transition-colors"
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

          <div className="grid grid-cols-3 gap-1 bg-[#102A43] p-1 rounded-xl border border-[#243B55] shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
          <div className="text-center py-10">
            <div className="w-8 h-8 border-2 border-[#00ADB5]/30 border-t-[#00ADB5] rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 mt-2 font-medium tracking-wider">
              Cargando préstamos...
            </p>
          </div>
        ) : loans.length === 0 ? (
          <div className="bg-[#0B192C] border border-[#1E3A5F]/70 rounded-2xl p-8 text-center">
            <div className="w-10 h-10 rounded-xl bg-[#00ADB5]/15 border border-[#00ADB5]/30 flex items-center justify-center mx-auto mb-2 text-[#00ADB5]">
              <HandCoins className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">
              {isLentMode ? 'No hay préstamos registrados' : 'No hay deudas registradas'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {search
                ? `Sin resultados para "${search}".`
                : isLentMode
                ? 'Registra préstamos para controlar el capital prestado y tus cobros de interés.'
                : 'Registra créditos para llevar el control de tus pagos a acreedores.'}
            </p>
            <button
              onClick={() => handleOpenCreateLoan(loanTypeTab)}
              className="mt-3 px-3.5 py-1.5 rounded-xl bg-linear-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] font-black text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3px]" />
              <span>{isLentMode ? 'Registrar Préstamo' : 'Registrar Deuda'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Toolbar count & fold/unfold */}
            <div className="flex items-center justify-between px-1 text-xs text-slate-400">
              <span className="font-semibold">
                {totalDebtors} {totalDebtors === 1 ? (isLentMode ? 'persona' : 'acreedor') : (isLentMode ? 'personas' : 'acreedores')}
              </span>
              <button
                type="button"
                onClick={toggleAllCurrentPage}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer select-none"
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
              const isMultiLoan = debtor.loans.length > 1;

              return (
                <div
                  key={debtor.borrower_name}
                  className={`bg-[#0B192C] border rounded-2xl overflow-hidden shadow-sm transition-all ${
                    isAllPaid
                      ? 'border-slate-800 opacity-90'
                      : isOverdue
                      ? 'border-rose-500/40'
                      : 'border-[#1E3A5F]/70 hover:border-[#00ADB5]/50'
                  }`}
                >
                  {/* Clean Debtor Header */}
                  <div className="p-3 sm:p-3.5 flex items-center justify-between gap-2.5 select-none bg-linear-to-r from-[#0B192C] via-[#102A43]/40 to-[#0B192C]">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => toggleDebtor(debtorKey)}
                        className="text-left font-bold text-white text-sm sm:text-base hover:text-cyan-400 transition-colors cursor-pointer truncate"
                      >
                        {debtor.borrower_name}
                      </button>

                      {isAllPaid ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-400">
                          Liquidado
                        </span>
                      ) : isOverdue ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-950/70 border border-rose-500/40 text-rose-300 flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" />
                          Vencido
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300">
                          Activo
                        </span>
                      )}

                      {isMultiLoan && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-[#102A43] text-slate-300">
                          {debtor.loans.length} {isLentMode ? 'préstamos' : 'deudas'}
                        </span>
                      )}
                    </div>

                    {/* Summary figures & Icon-only Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right text-xs">
                        <div className="flex items-center gap-1 justify-end font-mono">
                          <span className="text-slate-400 text-[10px]">Resta:</span>
                          <span className="font-bold text-amber-300">
                            {formatCOP(debtor.total_remaining_to_collect)}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Total {formatCOP(debtor.total_to_collect)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenCreateLoan(debtor.loans[0]?.loan_type || loanTypeTab, debtor.borrower_name)}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] hover:border-cyan-400 text-cyan-400 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
                          title={isLentMode ? `Prestar más a ${debtor.borrower_name}` : `Registrar otra deuda con ${debtor.borrower_name}`}
                          aria-label="Agregar acuerdo"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleDebtor(debtorKey)}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                            isDebtorExpanded
                              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                              : 'bg-[#102A43] border-[#243B55] text-slate-300 hover:text-white hover:bg-[#152E4D]'
                          }`}
                          title={isDebtorExpanded ? 'Ocultar acuerdos' : 'Ver acuerdos'}
                          aria-label="Desplegar acuerdos"
                        >
                          {isDebtorExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sub-loans List inside Debtor */}
                  {isDebtorExpanded && (
                    <div className="divide-y divide-[#1E3A5F]/40 border-t border-[#1E3A5F]/50">
                      {debtor.loans.map((loan: any) => {
                        const isLoanPaid = loan.status === 'PAID';
                        const isLoanExpanded = expandedLoanId === loan.id;
                        const isLoanOverdue =
                          !isLoanPaid &&
                          loan.due_date &&
                          new Date(loan.due_date).getTime() < new Date().setHours(0, 0, 0, 0);

                        return (
                          <div key={loan.id} className="p-3 sm:p-3.5 space-y-2 bg-[#070F1E]/40">
                            {/* Meta row & Icon-only actions */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex flex-col gap-2 flex-wrap text-xs text-slate-400">
                                <section className='flex gap-2'>
                                  {loan.notes && (
                                    <span className="text-cyan-300/90 font-medium italic truncate max-w-xs text-xs">
                                      "{loan.notes}"
                                    </span>
                                  )}
                                  <span className="px-1.5 py-0.2 rounded-md bg-[#102A43] border border-[#243B55] text-[10px] font-mono text-slate-300">
                                    Plazo: {loan.duration_months || 1} {Number(loan.duration_months) === 1 ? 'mes' : 'meses'}
                                  </span>
                                </section>
                                <section className='flex gap-2'>
                                  <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                    <Calendar className="w-2.5 h-2.5 text-slate-500" />
                                    <span>{formatShortDateSpanish(loan.start_date)}</span>
                                  </span>
                                  {loan.due_date && (
                                    <span className={`flex items-center gap-1 text-[10px] ${isLoanOverdue ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                                      <Clock className="w-2.5 h-2.5" />
                                      <span>Vence: {formatShortDateSpanish(loan.due_date)}</span>
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400">
                                    • {loan.payment_method || 'Efectivo'}
                                  </span>
                                </section>
                              </div>

                              {/* Icon-only Actions */}
                              <div className="flex items-center gap-1 ml-auto">
                                {!isLoanPaid && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPayment(loan)}
                                    className="w-7 h-7 rounded-xl bg-linear-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] hover:opacity-90 flex items-center justify-center shadow-md shadow-[#00ADB5]/20 cursor-pointer transition-all"
                                    title={isLentMode ? 'Registrar abono' : 'Registrar pago'}
                                    aria-label="Registrar abono"
                                  >
                                    <DollarSign size={14} className="stroke-[2.5px]" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setExpandedLoanId(isLoanExpanded ? null : loan.id)}
                                  className={`h-7 px-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                    isLoanExpanded
                                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                                      : 'bg-[#102A43] border-[#243B55] text-slate-300 hover:text-white hover:bg-[#152E4D]'
                                  }`}
                                  title="Historial de abonos"
                                  aria-label="Historial de abonos"
                                >
                                  <ListCheck size={14} className="text-cyan-400" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenEditLoan(loan)}
                                  className="w-7 h-7 rounded-xl bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] text-slate-300 hover:text-cyan-300 flex items-center justify-center transition-all cursor-pointer"
                                  title="Editar préstamo completo"
                                  aria-label="Editar préstamo"
                                >
                                  <Edit size={14}/>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteLoan(loan.id, debtor.borrower_name)}
                                  className="w-7 h-7 rounded-xl bg-[#102A43] hover:bg-rose-500/20 border border-[#243B55] hover:border-rose-500/40 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-all cursor-pointer"
                                  title="Eliminar préstamo y devolver capital a tu cuenta"
                                  aria-label="Eliminar préstamo"
                                >
                                  <Trash2 size={14}/>
                                </button>
                              </div>
                            </div>

                            {/* Progress Bar with Percentage */}
                            <div className="space-y-1.5 pt-1">
                              <div className="flex items-center justify-between text-xs font-mono">
                                <div className="flex items-center gap-1.5 text-[11px] truncate text-slate-400">
                                  <span className="text-slate-500">Recogido:</span>
                                  <span className="text-emerald-400 font-bold">
                                    {formatCOP(loan.total_collected)}
                                  </span>
                                  <span className="text-slate-600">/</span>
                                  <span className="text-amber-300 font-semibold">
                                    {formatCOP(loan.total_to_collect)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
                                    Progreso
                                  </span>
                                  <span className="text-xs font-extrabold font-mono text-cyan-300 shadow-xs">
                                    {Math.min(100, Math.max(0, loan.progress_percentage || 0))}%
                                  </span>
                                </div>
                              </div>
                              <div className="w-full h-1.5 bg-[#102A43] rounded-full overflow-hidden border border-[#1E3A5F]/40">
                                <div
                                  className="h-full rounded-full bg-linear-to-r from-[#00ADB5] to-emerald-400 transition-all duration-500"
                                  style={{ width: `${Math.min(100, Math.max(0, loan.progress_percentage || 0))}%` }}
                                />
                              </div>
                            </div>

                            {/* Responsive KPI Metrics: 1 column on mobile with horizontal flex row, 3 columns on tablet/desktop */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-0.5">
                              {/* Capital */}
                              <div className="bg-[#102A43]/50 border border-[#1E3A5F]/60 rounded-xl p-2.5 flex items-center justify-between sm:flex-col sm:items-start gap-1 shadow-xs">
                                <div className="min-w-0">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                    {isLentMode ? 'Capital Prestado' : 'Capital Recibido'}
                                  </span>
                                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                    Resta: <span className={isLoanPaid ? 'text-emerald-400 font-bold' : 'text-slate-200 font-semibold'}>{formatCOP(loan.remaining_capital)}</span>
                                  </div>
                                </div>
                                <div className="text-right sm:text-left shrink-0">
                                  <div className="font-extrabold font-mono text-white text-sm sm:text-base">
                                    {formatCOP(loan.initial_amount)}
                                  </div>
                                </div>
                              </div>

                              {/* Interés */}
                              <div className="bg-[#102A43]/50 border border-emerald-500/25 rounded-xl p-2.5 flex items-center justify-between sm:flex-col sm:items-start gap-1 shadow-xs">
                                <div className="min-w-0">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                                    {loan.interest_rate > 0 ? `Interés (${loan.interest_rate}%)` : 'Interés Fijo'}
                                  </span>
                                  <div className="text-[11px] font-mono text-emerald-300/80 mt-0.5">
                                    Cobrado: <span className="font-semibold">{formatCOP(loan.paid_interest)}</span>
                                  </div>
                                </div>
                                <div className="text-right sm:text-left shrink-0">
                                  <div className="font-extrabold font-mono text-emerald-400 text-sm sm:text-base">
                                    +{formatCOP(loan.projected_interest)}
                                  </div>
                                </div>
                              </div>

                              {/* Total Acuerdo */}
                              <div className="bg-[#102A43]/50 border border-amber-500/30 rounded-xl p-2.5 flex items-center justify-between sm:flex-col sm:items-start gap-1 shadow-xs">
                                <div className="min-w-0">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                                    {isLentMode ? 'Total a Recoger' : 'Total a Pagar'}
                                  </span>
                                  <div className="text-[11px] font-mono text-slate-300 mt-0.5">
                                    Faltan: <span className="text-amber-300 font-bold">{formatCOP(loan.remaining_to_collect)}</span>
                                  </div>
                                </div>
                                <div className="text-right sm:text-left shrink-0">
                                  <div className="font-extrabold font-mono text-amber-300 text-sm sm:text-base">
                                    {formatCOP(loan.total_to_collect)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Abonos Accordion */}
                            {isLoanExpanded && (
                              <div className="p-2.5 bg-[#0B192C] border border-[#1E3A5F] rounded-xl space-y-1.5 mt-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-white uppercase text-[10px] tracking-wider">
                                    Historial de Abonos ({loan.payments?.length || 0})
                                  </span>
                                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                                    Total abonado: {formatCOP(loan.total_collected)}
                                  </span>
                                </div>

                                {(!loan.payments || loan.payments.length === 0) ? (
                                  <p className="text-center py-2.5 text-xs text-slate-500">
                                    Sin abonos registrados todavía.
                                  </p>
                                ) : (
                                  <div className="space-y-1">
                                    {loan.payments.map((p: any) => (
                                      <div
                                        key={p.id}
                                        className="bg-[#102A43] border border-[#243B55] rounded-lg p-2 flex items-center justify-between gap-2 text-xs"
                                      >
                                        <div>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-white font-mono">
                                              +{formatCOP(p.total_amount)}
                                            </span>
                                            <span className="text-[9px] px-1 py-0.2 rounded bg-[#0B192C] border border-[#243B55] text-slate-300">
                                              {p.payment_method || 'Cuenta'}
                                            </span>
                                            <span className="text-[9px] text-slate-400">
                                              {formatShortDateSpanish(p.payment_date)}
                                            </span>
                                          </div>
                                          <div className="text-[9px] text-slate-300 mt-0.5">
                                            <span>Cap: <strong className="text-cyan-300 font-mono">+{formatCOP(p.capital_amount)}</strong></span>
                                            <span className="mx-1">•</span>
                                            <span>Int: <strong className="text-emerald-300 font-mono">+{formatCOP(p.interest_amount)}</strong></span>
                                            {p.notes && <span className="text-slate-400 italic ml-1">({p.notes})</span>}
                                          </div>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => handleDeletePayment(loan.id, p.id)}
                                          className="w-6 h-6 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer"
                                          title="Revertir abono"
                                          aria-label="Revertir abono"
                                        >
                                          <Trash2 className="w-3 h-3" />
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

      {/* UNIFIED MODAL: REGISTRAR / EDITAR PRÉSTAMO */}
      {isLoanModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-lg bg-[#0B192C] border-t sm:border border-[#1E3A5F] rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
            <form onSubmit={handleSaveLoan} className="flex flex-col h-full max-h-[92vh] sm:max-h-[90vh]">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-[#1E3A5F] shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-[#102A43] p-0.5 rounded-xl border border-[#243B55] gap-1">
                    <button
                      type="button"
                      onClick={() => setFormLoanType('LENT')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        formLoanType === 'LENT'
                          ? 'bg-[#00ADB5]/20 text-[#00ADB5] border border-[#00ADB5]/40 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#00ADB5]" />
                      <span>Por Cobrar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormLoanType('BORROWED')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        formLoanType === 'BORROWED'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5 text-amber-400" />
                      <span>Por Pagar</span>
                    </button>
                  </div>
                  {loanModalMode === 'edit' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-cyan-300">
                      Edición
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsLoanModalOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3.5">
                {/* Amount Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-400">
                      {formLoanType === 'LENT' ? 'Capital a Prestar ($ COP) *' : 'Monto de la Deuda ($ COP) *'}
                    </label>
                    {Number(formInitialAmount) > 0 && (
                      <span
                        className={`text-xs font-extrabold px-2 py-0.5 rounded-lg border transition-all ${
                          formLoanType === 'LENT'
                            ? 'bg-[#00ADB5]/10 text-[#00ADB5] border-[#00ADB5]/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {formatCOP(Number(formInitialAmount) || 0)}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <span
                      className={`absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black ${
                        formLoanType === 'LENT' ? 'text-[#00ADB5]' : 'text-amber-400'
                      }`}
                    >
                      $
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      required
                      min="1000"
                      step="500"
                      placeholder="0"
                      value={formInitialAmount}
                      onChange={(e) => setFormInitialAmount(e.target.value)}
                      className="w-full bg-[#102A43] border border-[#243B55] focus:border-[#00ADB5] text-white text-2xl sm:text-3xl font-extrabold pl-10 pr-4 py-2 sm:py-2.5 rounded-2xl focus:outline-none transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                {/* Person details: Name ONLY (Phone removed) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {formLoanType === 'LENT' ? 'Nombre de la Persona *' : 'Acreedor / Prestamista *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formBorrowerName}
                    onChange={(e) => setFormBorrowerName(e.target.value)}
                    placeholder={formLoanType === 'LENT' ? 'Ej: Carlos Gómez' : 'Ej: Banco, Prestamista'}
                    className="w-full bg-[#102A43] border border-[#243B55] focus:border-[#00ADB5] text-white text-sm px-3 py-2 rounded-xl focus:outline-none"
                  />
                  {existingContacts.length > 0 && !formBorrowerName && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      <span className="text-[10px] text-slate-400">Existentes:</span>
                      {existingContacts.slice(0, 5).map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setFormBorrowerName(name)}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-[#102A43] hover:bg-[#152E4D] border border-[#243B55] text-cyan-300 transition-colors cursor-pointer"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Interest calculation */}
                <div className="bg-[#102A43]/70 border border-[#243B55] rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <BadgePercent className="w-3.5 h-3.5 text-[#00ADB5]" />
                      <span className="text-xs font-bold text-slate-300">
                        Interés Mensual
                      </span>
                    </div>
                    <div className="flex items-center bg-[#0B192C] p-0.5 rounded-xl border border-[#243B55]">
                      <button
                        type="button"
                        onClick={() => setFormInterestType('PERCENT')}
                        className={`px-2 py-0.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                          formInterestType === 'PERCENT'
                            ? 'bg-[#00ADB5] text-[#0B192C] shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        % Mensual
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormInterestType('FIXED')}
                        className={`px-2 py-0.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                          formInterestType === 'FIXED'
                            ? 'bg-[#00ADB5] text-[#0B192C] shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        $ Fijo
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                    {formInterestType === 'PERCENT' ? (
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={formInterestRate}
                          onChange={(e) => setFormInterestRate(e.target.value)}
                          placeholder="10"
                          className="w-full bg-[#0B192C] border border-[#243B55] focus:border-[#00ADB5] rounded-xl px-3 py-1.5 text-sm font-mono font-bold text-white outline-none pr-14"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cyan-300 font-bold">% mes</span>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="500"
                          value={formFixedInterest}
                          onChange={(e) => setFormFixedInterest(e.target.value)}
                          placeholder="Ej: 50000"
                          className="w-full bg-[#0B192C] border border-[#243B55] focus:border-[#00ADB5] rounded-xl px-3 py-1.5 text-sm font-mono font-bold text-white outline-none pr-12"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">COP</span>
                      </div>
                    )}

                    <div className="bg-[#0B192C]/80 border border-[#243B55]/60 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Interés:</span>
                      <span className="text-cyan-300 font-mono font-bold">+{formatCOP(calculatedFormInterest)}/mes</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#243B55]/70 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#0B192C]/50 p-2 rounded-xl border border-[#243B55]/40">
                      <span className="text-[10px] text-slate-400 block">
                        {formLoanType === 'LENT' ? 'Ganancia Proyectada:' : 'Costo en Intereses:'}
                      </span>
                      <span className="text-emerald-400 font-mono font-bold text-xs sm:text-sm">
                        {formatCOP(calculatedFormProjectedInterest)}
                      </span>
                    </div>
                    <div className="bg-[#0B192C]/50 p-2 rounded-xl border border-[#243B55]/40">
                      <span className="text-[10px] text-amber-400 block">
                        {formLoanType === 'LENT' ? 'Total a Recoger:' : 'Total a Pagar:'}
                      </span>
                      <span className="text-amber-300 font-mono font-bold text-xs sm:text-sm">
                        {formatCOP(calculatedFormTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Plazo & Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Plazo (Meses)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={formDurationMonths}
                      onChange={(e) => {
                        const m = e.target.value;
                        setFormDurationMonths(m);
                        if (formStartDate && Number(m) > 0) {
                          const d = new Date(formStartDate);
                          d.setMonth(d.getMonth() + Number(m));
                          setFormDueDate(d.toISOString().split('T')[0]);
                        }
                      }}
                      placeholder="1"
                      className="w-full bg-[#102A43] border border-[#243B55] focus:border-[#00ADB5] rounded-xl px-3 py-1.5 text-xs sm:text-sm font-mono font-bold text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Fecha Inicio *
                    </label>
                    <input
                      type="date"
                      required
                      value={formStartDate}
                      onChange={(e) => {
                        const start = e.target.value;
                        setFormStartDate(start);
                        if (start && Number(formDurationMonths) > 0) {
                          const d = new Date(start);
                          d.setMonth(d.getMonth() + Number(formDurationMonths));
                          setFormDueDate(d.toISOString().split('T')[0]);
                        }
                      }}
                      className="w-full bg-[#102A43] border border-[#243B55] focus:border-[#00ADB5] rounded-xl px-2.5 py-1.5 text-xs sm:text-sm text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Fecha Vencimiento
                    </label>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full bg-[#102A43] border border-[#243B55] focus:border-[#00ADB5] rounded-xl px-2.5 py-1.5 text-xs sm:text-sm text-white outline-none"
                    />
                  </div>
                </div>

                {/* Account & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      {formLoanType === 'LENT' ? 'Cuenta de Desembolso (-)' : 'Cuenta Receptora (+)'}
                    </label>
                    <select
                      value={formPaymentMethod}
                      onChange={(e) => setFormPaymentMethod(e.target.value)}
                      className="w-full bg-[#102A43] border border-[#243B55] focus:border-[#00ADB5] rounded-xl px-3 py-2 text-xs sm:text-sm text-white outline-none"
                    >
                      {paymentMethods.map((pm: any) => (
                        <option key={pm.id} value={pm.name}>
                          {pm.name}
                        </option>
                      ))}
                      {paymentMethods.length === 0 && <option value="Efectivo">Efectivo</option>}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Notas / Condiciones
                    </label>
                    <input
                      type="text"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Ej: Garantía, pago quincenal, etc."
                      className="w-full bg-[#102A43] border border-[#243B55] focus:border-[#00ADB5] text-white text-xs sm:text-sm px-3 py-2 rounded-xl focus:outline-none placeholder-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 sm:p-4 border-t border-[#1E3A5F] bg-[#0B192C] shrink-0">
                <button
                  type="submit"
                  disabled={isSavingLoan}
                  className={`w-full py-3 px-4 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer ${
                    formLoanType === 'LENT'
                      ? 'bg-linear-to-r from-[#00ADB5] to-[#06B6D4] text-[#0B192C] shadow-[#00ADB5]/25'
                      : 'bg-linear-to-r from-amber-500 to-orange-400 text-slate-950 shadow-amber-500/25'
                  }`}
                >
                  {isSavingLoan ? (
                    <span>Guardando...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3px]" />
                      <span>
                        {loanModalMode === 'edit'
                          ? 'Guardar Cambios del Préstamo'
                          : formLoanType === 'LENT'
                          ? 'Guardar Préstamo por Cobrar'
                          : 'Guardar Deuda por Pagar'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR ABONO */}
      {selectedLoanForPayment && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-md bg-[#0B192C] border-t sm:border border-[#1E3A5F] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
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
                type="button"
                onClick={() => setSelectedLoanForPayment(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-[#102A43] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
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
                      <span>Capital adeudado:</span>
                      <span className="font-mono font-bold text-white">{formatCOP(remCap)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Cobro de interés ({selectedLoanForPayment.interest_rate > 0 ? `${selectedLoanForPayment.interest_rate}%` : 'fijo'}):</span>
                      <span className="font-mono font-bold text-emerald-400">+{formatCOP(monthlyFee)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-1 border-t border-[#243B55] text-amber-300">
                      <span>Total para saldar hoy:</span>
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
                    >
                      Saldar Todo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const half = Math.round(remCap / 2);
                        setPayCapital(String(half));
                        setPayInterest(String(monthlyFee > 0 ? monthlyFee : ''));
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-[#102A43] border border-[#243B55] text-[11px] font-bold text-slate-300 hover:bg-[#152E4D] cursor-pointer"
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

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingPayment || calculatedTotalPayment <= 0}
                  className="w-full py-2.5 px-4 rounded-2xl bg-linear-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-sm shadow-xl hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[3px]" />
                  <span>{isSubmittingPayment ? 'Registrando...' : `Abonar ${formatCOP(calculatedTotalPayment)}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
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
