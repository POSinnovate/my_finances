'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { QuickExpenseModal } from '@/components/expenses/QuickExpenseModal';
import { formatCOP } from '@/lib/utils';
import dayjs, { formatShortDateSpanish, getTodayColombiaDate } from '@/lib/dayjs';
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
  ListCheck,
  Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { PageBanner, Pagination, Button, Badge, Modal, Input, Select } from '@/components/ui';

export default function LoansPage() {
  const invalidateFinance = useInvalidateFinance();
  const { data: user } = useUser();
  const { data: paymentMethods = [] } = usePaymentMethods();
  const { data: categories = [] } = useCategories();

  // Mode: 'LENT' (Por Cobrar / Me deben) vs 'BORROWED' (Por Pagar / Yo debo)
  const [loanTypeTab, setLoanTypeTab] = useState<'LENT' | 'BORROWED'>('LENT');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'OVERDUE' | 'PAID' | 'ALL'>('ACTIVE');

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
  const [formTag, setFormTag] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('ALL');
  const [formInitialAmount, setFormInitialAmount] = useState('');
  const [formDurationMonths, setFormDurationMonths] = useState('1');
  const [formInterestType, setFormInterestType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [formInterestRate, setFormInterestRate] = useState('10');
  const [formFixedInterest, setFormFixedInterest] = useState('');
  const [formHasInstallments, setFormHasInstallments] = useState(false);
  const [formInstallmentCount, setFormInstallmentCount] = useState('2');
  const [formInstallmentFrequency, setFormInstallmentFrequency] = useState<'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('MONTHLY');
  const [formStartDate, setFormStartDate] = useState(getTodayColombiaDate());
  const [formDueDate, setFormDueDate] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('');
  const [formPocketId, setFormPocketId] = useState<string | null>(null);
  const [showLoanPockets, setShowLoanPockets] = useState(false);
  const [formNotes, setFormNotes] = useState('');
  const [isSavingLoan, setIsSavingLoan] = useState(false);
  const [isExtendingLoanId, setIsExtendingLoanId] = useState<string | null>(null);

  // Payment Form State
  const [payCapital, setPayCapital] = useState('');
  const [payInterest, setPayInterest] = useState('');
  const [payMethod, setPayMethod] = useState('');
  const [payDate, setPayDate] = useState(getTodayColombiaDate());
  const [payNotes, setPayNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [activePaymentShortcut, setActivePaymentShortcut] = useState<'INTEREST_ONLY' | 'SETTLE_ALL' | 'HALF_CAPITAL' | 'INSTALLMENT' | null>(null);

  // Group loans by debtor (borrower_name)
  const groupedDebtors = useMemo(() => {
    const map = new Map<string, {
      borrower_name: string;
      loans: any[];
      tags: string[];
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
      const remainingCap = Number(loan.remaining_capital) || Number(loan.current_balance) || 0;
      const isPaid = loan.status === 'PAID' || remainingCap <= 0;
      const isOverdue =
        !isPaid &&
        loan.due_date &&
        new Date(loan.due_date).getTime() < new Date().setHours(0, 0, 0, 0);
      const loanMonthly =
        loan.monthly_interest ||
        (loan.interest_rate > 0
          ? Math.round(remainingCap * (loan.interest_rate / 100))
          : Number(loan.expected_interest) || 0);

      const projInt = Number(loan.projected_interest) || 0;
      const totToCollect = Number(loan.total_to_collect) || (remainingCap + projInt);
      const totCollected = Number(loan.total_collected) || ((Number(loan.paid_capital) || 0) + (Number(loan.paid_interest) || 0));
      const remToCollect = Number(loan.remaining_to_collect) ?? Math.max(0, totToCollect - totCollected);
      const loanTag = (loan.tag || '').trim();

      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          borrower_name: loan.borrower_name,
          loans: [loan],
          tags: loanTag ? [loanTag] : [],
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
        if (loanTag && !existing.tags.includes(loanTag)) {
          existing.tags.push(loanTag);
        }
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

  // Dynamic tags extracted from existing loans
  const availableTags = useMemo(() => {
    const map = new Map<string, number>();
    loans.forEach((l: any) => {
      const t = (l.tag || '').trim();
      if (t) map.set(t, (map.get(t) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [loans]);

  const existingTags = useMemo(() => availableTags.map(t => t.name), [availableTags]);

  // Filter debtors by selected tag
  const filteredDebtors = useMemo(() => {
    if (selectedTagFilter === 'ALL') return groupedDebtors;
    return groupedDebtors.filter((d: any) =>
      d.loans.some((l: any) => (l.tag || '').trim().toLowerCase() === selectedTagFilter.trim().toLowerCase())
    );
  }, [groupedDebtors, selectedTagFilter]);

  // Pagination & Debtor Collapsing State
  const ITEMS_PER_PAGE = 8;
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedDebtorKeys, setExpandedDebtorKeys] = useState<Set<string>>(new Set());

  // Reset pagination & fold all cards on tab, search, status, or tag filter change
  useEffect(() => {
    setCurrentPage(1);
    setExpandedDebtorKeys(new Set());
  }, [loanTypeTab, search, statusFilter, selectedTagFilter]);

  const totalDebtors = filteredDebtors.length;
  const totalPages = Math.ceil(totalDebtors / ITEMS_PER_PAGE) || 1;

  const paginatedDebtors = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDebtors.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDebtors, currentPage, ITEMS_PER_PAGE]);

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
    if (formInterestType === 'FIXED') {
      return Number(formFixedInterest) || 0;
    }
    const months = Number(formDurationMonths) || 1;
    return calculatedFormInterest * months;
  }, [calculatedFormInterest, formDurationMonths, formInterestType, formFixedInterest]);

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
    setFormTag('');
    setFormInitialAmount('');
    setFormDurationMonths('1');
    setFormInterestType('PERCENT');
    setFormInterestRate('10');
    setFormFixedInterest('');
    setFormHasInstallments(false);
    setFormInstallmentCount('2');
    setFormInstallmentFrequency('MONTHLY');
    const today = getTodayColombiaDate();
    setFormStartDate(today);
    // Auto-calculate due date: +1 month
    setFormDueDate(dayjs(today).add(1, 'month').format('YYYY-MM-DD'));
    setFormPaymentMethod(paymentMethods[0]?.name || 'Efectivo');
    setFormPocketId(null);
    setShowLoanPockets(false);
    setFormNotes(prefillDebtor ? `Préstamo adicional` : '');
    setIsLoanModalOpen(true);
  };

  // Open Edit Loan Modal (with all fields loaded)
  const handleOpenEditLoan = (loan: any) => {
    setLoanModalMode('edit');
    setSelectedLoanForEdit(loan);
    setFormLoanType(loan.loan_type || 'LENT');
    setFormBorrowerName(loan.borrower_name || '');
    setFormTag(loan.tag || '');
    setFormInitialAmount(String(loan.initial_amount || ''));
    setFormDurationMonths(String(loan.duration_months || 1));
    const isFixed = loan.interest_type === 'FIXED' || (Number(loan.interest_rate) === 0 && Number(loan.expected_interest) > 0);
    if (isFixed) {
      setFormInterestType('FIXED');
      setFormFixedInterest(String(loan.expected_interest || ''));
      setFormInterestRate('0');
    } else {
      setFormInterestType('PERCENT');
      setFormInterestRate(String(loan.interest_rate || 10));
      setFormFixedInterest('');
    }
    setFormHasInstallments(Boolean(loan.has_installments));
    setFormInstallmentCount(String(loan.installment_count || 2));
    setFormInstallmentFrequency(loan.installment_frequency || 'MONTHLY');
    const sDate = loan.start_date ? loan.start_date.split('T')[0] : getTodayColombiaDate();
    setFormStartDate(sDate);
    setFormDueDate(loan.due_date || '');
    setFormPaymentMethod(loan.payment_method || paymentMethods[0]?.name || 'Efectivo');
    setFormPocketId(loan.pocket_id || null);
    setShowLoanPockets(Boolean(loan.pocket_id));
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

    const isFixed = formInterestType === 'FIXED';
    let durationM = isFixed ? 1 : Math.max(1, Number(formDurationMonths) || 1);
    let finalDueDate = formDueDate;

    if (!isFixed) {
      // Percentage loan: due date is strictly start_date + duration_months
      finalDueDate = dayjs(formStartDate).add(durationM, 'month').format('YYYY-MM-DD');
    } else if (!finalDueDate) {
      // Fixed interest without date: default to 1 month or today + 15 days
      finalDueDate = dayjs(formStartDate).add(1, 'month').format('YYYY-MM-DD');
    }

    // Validate that due_date cannot be in the past
    const todayStr = getTodayColombiaDate();
    if (finalDueDate < todayStr) {
      toast.error('La fecha de vencimiento no puede ser anterior al día de hoy');
      return;
    }

    const instCount = Math.max(1, Number(formInstallmentCount) || 1);
    const instAmt = formHasInstallments && isFixed
      ? Math.round(calculatedFormTotal / instCount)
      : 0;

    setIsSavingLoan(true);
    try {
      const isEditing = loanModalMode === 'edit' && selectedLoanForEdit;
      const url = isEditing ? `/api/loans/${selectedLoanForEdit.id}` : '/api/loans';
      const method = isEditing ? 'PUT' : 'POST';

      const payload = {
        loan_type: formLoanType,
        borrower_name: formBorrowerName.trim(),
        tag: formTag.trim() || null,
        initial_amount: principal,
        interest_type: formInterestType,
        duration_months: durationM,
        interest_rate: !isFixed ? Number(formInterestRate) || 0 : 0,
        expected_interest: calculatedFormInterest,
        has_installments: isFixed ? formHasInstallments : false,
        installment_count: isFixed && formHasInstallments ? instCount : 1,
        installment_frequency: isFixed && formHasInstallments ? formInstallmentFrequency : 'MONTHLY',
        installment_amount: instAmt,
        start_date: formStartDate,
        due_date: finalDueDate,
        payment_method: formPaymentMethod || paymentMethods[0]?.name || 'Efectivo',
        pocket_id: formPocketId || null,
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

  // Extend Term 1-Click Action (+1 Month)
  const handleExtendTerm = async (loan: any, monthsToAdd = 1) => {
    setIsExtendingLoanId(loan.id);
    try {
      const res = await fetch(`/api/loans/${loan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extend_months: monthsToAdd,
          status: 'ACTIVE',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Plazo extendido +${monthsToAdd} mes(es). El acuerdo vuelve a estar Activo.`);
        refetchLoans();
        invalidateFinance();
      } else {
        toast.error(data.error || 'Error al extender plazo');
      }
    } catch {
      toast.error('Error de conexión al extender plazo');
    } finally {
      setIsExtendingLoanId(null);
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
    setActivePaymentShortcut(monthlyFee > 0 ? 'INTEREST_ONLY' : null);
    setPayMethod(paymentMethods[0]?.name || 'Nequi');
    setPayDate(getTodayColombiaDate());
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
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-24">
      <Header user={user} onUserUpdate={invalidateFinance} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 pt-5 pb-28 sm:pb-32 space-y-4">
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
        <div className="bg-surface border border-border p-1 rounded-2xl grid grid-cols-2 gap-1 shadow-md">
          <Button
            type="button"
            variant={isLentMode ? 'primary' : 'ghost'}
            onClick={() => setLoanTypeTab('LENT')}
            icon={ArrowUpRight}
            className="w-full text-xs sm:text-sm py-2"
          >
            <span>Por Cobrar</span>
            <Badge variant={isLentMode ? 'primary' : 'secondary'} size="sm">
              {summary.active_lent_count || 0}
            </Badge>
          </Button>

          <Button
            type="button"
            variant={!isLentMode ? 'accent' : 'ghost'}
            onClick={() => setLoanTypeTab('BORROWED')}
            icon={ArrowDownLeft}
            className="w-full text-xs sm:text-sm py-2"
          >
            <span>Por Pagar</span>
            <Badge variant={!isLentMode ? 'accent' : 'secondary'} size="sm">
              {summary.active_borrowed_count || 0}
            </Badge>
          </Button>
        </div>

        {/* 4 Minimalist Executive KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="bg-surface border border-border rounded-2xl p-3 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {isLentMode ? 'Capital Pendiente' : 'Capital por Pagar'}
              </span>
              <HandCoins className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base lg:text-lg font-black text-foreground font-mono truncate">
                {formatCOP(summary.total_active_capital_lent)}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                {summary.active_loans_count} {summary.active_loans_count === 1 ? 'activo' : 'activos'}
              </p>
            </div>
          </div>

          <div className="bg-surface border border-emerald-500/30 rounded-2xl p-3 shadow-sm flex flex-col justify-between">
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

          <div className="bg-surface border border-amber-500/30 rounded-2xl p-3 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider truncate">
                Capital Total
              </span>
              <CircleDollarSign className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base lg:text-lg font-black text-amber-300 font-mono truncate">
                {formatCOP(summary.net_capital_total ?? (summary.total_active_capital_lent - (summary.total_active_borrowed_capital || 0)))}
              </div>
              <p className="text-[10px] text-amber-400/80 mt-0.5 truncate">
                Cobrar: {formatCOP(summary.total_active_lent_capital ?? summary.total_active_capital_lent)} | Pagar: {formatCOP(summary.total_active_borrowed_capital ?? 0)}
              </p>
            </div>
          </div>

          <div className="bg-surface border border-purple-500/30 rounded-2xl p-3 shadow-sm flex flex-col justify-between">
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-surface border border-border rounded-2xl p-2 shadow-sm">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isLentMode ? "Buscar por persona o nota..." : "Buscar por acreedor o entidad..."}
              className="w-full bg-surface-elevated border border-border focus:border-primary rounded-xl pl-8 pr-7 py-1.5 text-xs text-foreground placeholder:text-slate-500 outline-none transition-colors"
            />
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setSearch('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground h-6 w-6 p-0"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-xl border border-border shrink-0 overflow-x-auto no-scrollbar whitespace-nowrap">
            <Button
              type="button"
              size="xs"
              variant={statusFilter === 'ACTIVE' ? 'primary' : 'ghost'}
              onClick={() => setStatusFilter('ACTIVE')}
              className="shrink-0"
            >
              Activos
            </Button>
            <Button
              type="button"
              size="xs"
              variant={statusFilter === 'OVERDUE' ? 'danger' : 'ghost'}
              onClick={() => setStatusFilter('OVERDUE')}
              className={`shrink-0 ${statusFilter !== 'OVERDUE' ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/15' : ''}`}
            >
              <span>Vencidos</span>
              {((isLentMode ? summary.overdue_lent_count : summary.overdue_borrowed_count) ?? 0) > 0 && (
                <span className={`ml-1 text-[9px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                  statusFilter === 'OVERDUE' ? 'bg-white text-rose-600' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {isLentMode ? summary.overdue_lent_count : summary.overdue_borrowed_count}
                </span>
              )}
            </Button>
            <Button
              type="button"
              size="xs"
              variant={statusFilter === 'PAID' ? 'primary' : 'ghost'}
              onClick={() => setStatusFilter('PAID')}
              className="shrink-0"
            >
              Pagados
            </Button>
            <Button
              type="button"
              size="xs"
              variant={statusFilter === 'ALL' ? 'primary' : 'ghost'}
              onClick={() => setStatusFilter('ALL')}
              className="shrink-0"
            >
              Todos
            </Button>
          </div>
        </div>


        {/* Dynamic Tags Carousel (never wraps/folds) */}
        {availableTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 whitespace-nowrap">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 shrink-0 mr-1">
              <Tag className="w-3 h-3 text-primary" />
              Etiquetas:
            </span>
            <Button
              type="button"
              size="xs"
              variant={selectedTagFilter === 'ALL' ? 'primary' : 'outline'}
              onClick={() => setSelectedTagFilter('ALL')}
              className="shrink-0"
            >
              Todas ({loans.length})
            </Button>
            {availableTags.map(({ name, count }) => {
              const isSelected = selectedTagFilter.toLowerCase() === name.toLowerCase();
              return (
                <Button
                  key={name}
                  type="button"
                  size="xs"
                  variant={isSelected ? 'primary' : 'outline'}
                  onClick={() => setSelectedTagFilter(isSelected ? 'ALL' : name)}
                  className="shrink-0"
                >
                  <span>{name}</span>
                  <Badge variant={isSelected ? 'primary' : 'secondary'} size="sm">
                    {count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        )}

        {/* Loans List */}
        {loadingLoans ? (
          <div className="text-center py-10">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 mt-2 font-medium tracking-wider">
              Cargando préstamos...
            </p>
          </div>
        ) : loans.length === 0 ? (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-2 text-primary">
              <HandCoins className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground">
              {statusFilter === 'OVERDUE'
                ? (isLentMode ? '¡Al día! No tienes préstamos vencidos' : '¡Excelente! No tienes deudas vencidas')
                : (isLentMode ? 'No hay préstamos registrados' : 'No hay deudas registradas')}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {search
                ? `Sin resultados para "${search}".`
                : statusFilter === 'OVERDUE'
                ? (isLentMode
                    ? 'Todos los clientes con préstamos activos están dentro de su fecha límite de pago.'
                    : 'No tienes obligaciones con acreedores fuera de plazo.')
                : isLentMode
                ? 'Registra préstamos para controlar el capital prestado y tus cobros de interés.'
                : 'Registra créditos para llevar el control de tus pagos a acreedores.'}
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenCreateLoan(loanTypeTab)}
              className="mt-3"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3px]" />
              <span>{isLentMode ? 'Registrar Préstamo' : 'Registrar Deuda'}</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Toolbar count & fold/unfold */}
            <div className="flex items-center justify-between px-1 text-xs text-slate-400">
              <span className="font-semibold">
                {totalDebtors} {totalDebtors === 1 ? (isLentMode ? 'persona' : 'acreedor') : (isLentMode ? 'personas' : 'acreedores')}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={toggleAllCurrentPage}
                icon={isAllExpanded ? ChevronUp : ChevronDown}
                className="text-accent hover:text-accent/80 p-0 font-bold h-auto"
              >
                {isAllExpanded ? 'Plegar todos' : 'Desplegar todos'}
              </Button>
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
                  className={`bg-surface border rounded-2xl overflow-hidden shadow-sm transition-all ${
                    isAllPaid
                      ? 'border-slate-800 opacity-90'
                      : isOverdue
                      ? 'border-rose-500/40'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {/* Clean Debtor Header */}
                  <div className="p-3 sm:p-3.5 flex items-center justify-between gap-2.5 select-none bg-surface-elevated/40">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => toggleDebtor(debtorKey)}
                        className="p-0 h-auto font-bold text-foreground text-sm sm:text-base hover:text-primary hover:bg-transparent justify-start truncate"
                      >
                        {debtor.borrower_name}
                      </Button>

                      {isAllPaid ? (
                        <Badge variant="success" size="sm">
                          Liquidado
                        </Badge>
                      ) : isOverdue ? (
                        <Badge variant="danger" size="sm" className="flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" />
                          Vencido
                        </Badge>
                      ) : (
                        <Badge variant="primary" size="sm">
                          Activo
                        </Badge>
                      )}

                      {isMultiLoan && (
                        <Badge variant="secondary" size="sm">
                          {debtor.loans.length} {isLentMode ? 'préstamos' : 'deudas'}
                        </Badge>
                      )}

                      {debtor.tags && debtor.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          {debtor.tags.map((t: string) => (
                            <Badge
                              key={t}
                              variant="accent"
                              size="sm"
                              className="flex items-center gap-1"
                            >
                              <Tag className="w-2.5 h-2.5 text-accent" />
                              {t}
                            </Badge>
                          ))}
                        </div>
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
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon-sm"
                          onClick={() => handleOpenCreateLoan(debtor.loans[0]?.loan_type || loanTypeTab, debtor.borrower_name)}
                          title={isLentMode ? `Prestar más a ${debtor.borrower_name}` : `Registrar otra deuda con ${debtor.borrower_name}`}
                          aria-label="Agregar acuerdo"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          type="button"
                          variant={isDebtorExpanded ? 'accent' : 'secondary'}
                          size="icon-sm"
                          onClick={() => toggleDebtor(debtorKey)}
                          title={isDebtorExpanded ? 'Ocultar acuerdos' : 'Ver acuerdos'}
                          aria-label="Desplegar acuerdos"
                        >
                          {isDebtorExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Sub-loans List inside Debtor */}
                  {isDebtorExpanded && (
                    <div className="divide-y divide-border border-t border-border">
                      {debtor.loans.map((loan: any) => {
                        const isLoanPaid = loan.status === 'PAID' || (Number(loan.remaining_capital) <= 0);
                        const isLoanExpanded = expandedLoanId === loan.id;
                        const isLoanOverdue = Boolean(loan.is_overdue);

                        return (
                          <div key={loan.id} className="p-3 sm:p-3.5 space-y-2.5 bg-background/40">
                            {/* Overdue Alert Banner if loan is overdue */}
                            {isLoanOverdue && !isLoanPaid && (
                              <div className="bg-rose-500/15 border border-rose-500/40 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-bold text-rose-300 block">
                                      {loan.overdue_reason === 'INTEREST_OVERDUE' && (
                                        <>Interés en Mora ({loan.overdue_months_count} {loan.overdue_months_count === 1 ? 'mes' : 'meses'})</>
                                      )}
                                      {loan.overdue_reason === 'INSTALLMENT_OVERDUE' && (
                                        <>Cuotas Atrasadas ({loan.overdue_installments_count} {loan.overdue_installments_count === 1 ? 'cuota' : 'cuotas'})</>
                                      )}
                                      {loan.overdue_reason === 'TERM_EXPIRED' && (
                                        <>Plazo Vencido sin Retorno de Capital</>
                                      )}
                                      {(!loan.overdue_reason || loan.overdue_reason === 'NONE') && 'Préstamo Vencido'}
                                    </span>
                                    <p className="text-[11px] text-rose-200/90 mt-0.5">
                                      {loan.overdue_reason === 'INTEREST_OVERDUE' && (
                                        <>Debe abonar <strong>{formatCOP(loan.amount_to_activate)}</strong> en intereses acumulados para volver a estar al día.</>
                                      )}
                                      {loan.overdue_reason === 'INSTALLMENT_OVERDUE' && (
                                        <>Debe pagar <strong>{formatCOP(loan.amount_to_activate)}</strong> para ponerse al día con las cuotas vencidas.</>
                                      )}
                                      {loan.overdue_reason === 'TERM_EXPIRED' && (
                                        <>El plazo pactado finalizó. Puedes saldar el capital o extender el plazo un mes más.</>
                                      )}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                  {/* 1-Click Extend Term */}
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="outline"
                                    disabled={isExtendingLoanId === loan.id}
                                    isLoading={isExtendingLoanId === loan.id}
                                    onClick={() => handleExtendTerm(loan, 1)}
                                    className="text-amber-300 border-amber-500/40 hover:bg-amber-500/20 text-[10px] font-bold"
                                    title="Extender plazo por 1 mes más para volver a Activos"
                                  >
                                    Extender Plazo (+1 mes)
                                  </Button>

                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="danger"
                                    onClick={() => handleOpenPayment(loan)}
                                    className="text-[10px] font-bold"
                                  >
                                    Poner al Día
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Meta row & Icon-only actions */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex flex-col gap-1.5 flex-wrap text-xs text-slate-400">
                                <section className='flex gap-1.5 flex-wrap items-center'>
                                  {/* Mode Badge */}
                                  <Badge variant={loan.interest_type === 'FIXED' ? 'secondary' : 'primary'} size="sm" className="font-semibold text-[10px]">
                                    {loan.interest_type === 'FIXED'
                                      ? (loan.has_installments ? `Fijo en ${loan.installment_count} Cuotas` : 'Interés Fijo')
                                      : `${loan.interest_rate}% Mensual`}
                                  </Badge>

                                  {loan.has_installments && (
                                    <Badge variant="accent" size="sm" className="font-mono text-[10px]">
                                      Cuota {loan.paid_installments || 0}/{loan.installment_count || 1} pagada
                                    </Badge>
                                  )}

                                  {loan.tag && (
                                    <Badge variant="accent" size="sm" className="flex items-center gap-1">
                                      <Tag className="w-2.5 h-2.5 text-accent" />
                                      {loan.tag}
                                    </Badge>
                                  )}
                                  {loan.notes && (
                                    <span className="text-accent/90 font-medium italic truncate max-w-xs text-xs">
                                      &quot;{loan.notes}&quot;
                                    </span>
                                  )}
                                  <Badge variant="secondary" size="sm" className="font-mono">
                                    Plazo: {loan.duration_months || 1} {Number(loan.duration_months) === 1 ? 'mes' : 'meses'}
                                  </Badge>
                                </section>
                                <section className='flex gap-2 items-center flex-wrap'>
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
                                  <Button
                                    type="button"
                                    variant="primary"
                                    size="icon-sm"
                                    onClick={() => handleOpenPayment(loan)}
                                    title={isLentMode ? 'Registrar abono' : 'Registrar pago'}
                                    aria-label="Registrar abono"
                                  >
                                    <DollarSign size={14} className="stroke-[2.5px]" />
                                  </Button>
                                )}

                                <Button
                                  type="button"
                                  variant={isLoanExpanded ? 'accent' : 'secondary'}
                                  size="sm"
                                  onClick={() => setExpandedLoanId(isLoanExpanded ? null : loan.id)}
                                  className="h-7 px-2 font-mono"
                                  title="Historial de abonos"
                                  aria-label="Historial de abonos"
                                >
                                  <ListCheck size={14} className="text-accent" />
                                </Button>

                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="icon-sm"
                                  onClick={() => handleOpenEditLoan(loan)}
                                  title="Editar préstamo completo"
                                  aria-label="Editar préstamo"
                                >
                                  <Edit size={14}/>
                                </Button>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleDeleteLoan(loan.id, debtor.borrower_name)}
                                  className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/20"
                                  title="Eliminar préstamo y devolver capital a tu cuenta"
                                  aria-label="Eliminar préstamo"
                                >
                                  <Trash2 size={14}/>
                                </Button>
                              </div>
                            </div>

                            {/* Progress Bar with Percentage (Recorrido de Capital) */}
                            <div className="space-y-1.5 pt-1">
                              <div className="flex items-center justify-between text-xs font-mono">
                                <div className="flex items-center gap-1.5 text-[11px] truncate text-slate-400">
                                  <span className="text-slate-500">{isLentMode ? 'Capital devuelto:' : 'Capital pagado:'}</span>
                                  <span className="text-emerald-400 font-bold">
                                    {formatCOP(loan.paid_capital)}
                                  </span>
                                  <span className="text-slate-600">/</span>
                                  <span className="text-slate-200 font-semibold">
                                    {formatCOP(loan.initial_amount)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
                                    Progreso Capital
                                  </span>
                                  <span className="text-xs font-extrabold font-mono text-accent shadow-xs">
                                    {Math.min(100, Math.max(0, loan.capital_progress ?? Math.round(((loan.paid_capital || 0) / (loan.initial_amount || 1)) * 100)))}%
                                  </span>
                                </div>
                              </div>
                              <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden border border-border">
                                <div
                                  className="h-full rounded-full bg-linear-to-r from-primary to-emerald-400 transition-all duration-500"
                                  style={{ width: `${Math.min(100, Math.max(0, loan.capital_progress ?? Math.round(((loan.paid_capital || 0) / (loan.initial_amount || 1)) * 100)))}%` }}
                                />
                              </div>
                            </div>

                            {/* Responsive KPI Metrics */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-0.5">
                              {/* Capital */}
                              <div className="bg-surface-elevated/50 border border-border rounded-xl p-2.5 flex items-center justify-between sm:flex-col sm:items-start gap-1 shadow-xs">
                                <div className="min-w-0">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                    {isLentMode ? 'Capital Prestado' : 'Capital Recibido'}
                                  </span>
                                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                    Resta: <span className={isLoanPaid ? 'text-emerald-400 font-bold' : 'text-slate-200 font-semibold'}>{formatCOP(loan.remaining_capital)}</span>
                                  </div>
                                </div>
                                <div className="text-right sm:text-left shrink-0">
                                  <div className="font-extrabold font-mono text-foreground text-sm sm:text-base">
                                    {formatCOP(loan.initial_amount)}
                                  </div>
                                </div>
                              </div>

                              {/* Interés */}
                              <div className="bg-surface-elevated/50 border border-emerald-500/25 rounded-xl p-2.5 flex items-center justify-between sm:flex-col sm:items-start gap-1 shadow-xs">
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
                              <div className="bg-surface-elevated/50 border border-amber-500/30 rounded-xl p-2.5 flex items-center justify-between sm:flex-col sm:items-start gap-1 shadow-xs">
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
                              <div className="p-2.5 bg-surface border border-border rounded-xl space-y-1.5 mt-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-foreground uppercase text-[10px] tracking-wider">
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
                                        className="bg-surface-elevated border border-border rounded-lg p-2 flex items-center justify-between gap-2 text-xs"
                                      >
                                        <div>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-foreground font-mono">
                                              +{formatCOP(p.total_amount)}
                                            </span>
                                            <Badge variant="secondary" size="sm">
                                              {p.payment_method || 'Cuenta'}
                                            </Badge>
                                            <span className="text-[9px] text-slate-400">
                                              {formatShortDateSpanish(p.payment_date)}
                                            </span>
                                          </div>
                                          <div className="text-[9px] text-slate-300 mt-0.5">
                                            <span>Cap: <strong className="text-accent font-mono">+{formatCOP(p.capital_amount)}</strong></span>
                                            <span className="mx-1">•</span>
                                            <span>Int: <strong className="text-emerald-300 font-mono">+{formatCOP(p.interest_amount)}</strong></span>
                                            {p.notes && <span className="text-slate-400 italic ml-1">({p.notes})</span>}
                                          </div>
                                        </div>

                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon-sm"
                                          onClick={() => handleDeletePayment(loan.id, p.id)}
                                          className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                                          title="Revertir abono"
                                          aria-label="Revertir abono"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
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
        <div className="fixed inset-0 z-70 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-lg bg-surface border-t sm:border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
            <form onSubmit={handleSaveLoan} className="flex flex-col h-full max-h-[92vh] sm:max-h-[90vh]">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-surface-elevated p-0.5 rounded-xl border border-border gap-1">
                    <Button
                      type="button"
                      size="xs"
                      variant={formLoanType === 'LENT' ? 'primary' : 'ghost'}
                      onClick={() => setFormLoanType('LENT')}
                      icon={ArrowUpRight}
                    >
                      Por Cobrar
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant={formLoanType === 'BORROWED' ? 'accent' : 'ghost'}
                      onClick={() => setFormLoanType('BORROWED')}
                      icon={ArrowDownLeft}
                    >
                      Por Pagar
                    </Button>
                  </div>
                  {loanModalMode === 'edit' && (
                    <Badge variant="accent" size="sm">
                      Edición
                    </Badge>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsLoanModalOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
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
                            ? 'bg-primary/10 text-primary border-primary/30'
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
                        formLoanType === 'LENT' ? 'text-primary' : 'text-amber-400'
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
                      className="w-full bg-surface-elevated border border-border focus:border-primary text-white text-2xl sm:text-3xl font-extrabold pl-10 pr-4 py-2 sm:py-2.5 rounded-2xl focus:outline-none transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                {/* Person details: Name ONLY */}
                <div>
                  <Input
                    label={formLoanType === 'LENT' ? 'Nombre de la Persona *' : 'Acreedor / Prestamista *'}
                    type="text"
                    required
                    value={formBorrowerName}
                    onChange={(e) => setFormBorrowerName(e.target.value)}
                    placeholder={formLoanType === 'LENT' ? 'Ej: Carlos Gómez' : 'Ej: Banco, Prestamista'}
                  />
                  {existingContacts.length > 0 && !formBorrowerName && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      <span className="text-[10px] text-foreground/50">Existentes:</span>
                      {existingContacts.slice(0, 5).map((name) => (
                        <Button
                          key={name}
                          type="button"
                          variant="secondary"
                          size="xs"
                          onClick={() => setFormBorrowerName(name)}
                          className="text-[10px] text-primary py-0.5 px-2 h-auto"
                        >
                          {name}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tag / Classification */}
                <div>
                  <Input
                    label={
                      <span>
                        Etiqueta / Clasificación <span className="text-[10px] text-foreground/50 font-normal">(Opcional: Trabajo, Externo, Familiar, etc.)</span>
                      </span>
                    }
                    type="text"
                    value={formTag}
                    onChange={(e) => setFormTag(e.target.value)}
                    placeholder="Ej: Trabajo, Externo, Familiar..."
                    maxLength={50}
                    leftIcon={<Tag className="w-3.5 h-3.5" />}
                  />
                  {/* Dynamic suggestions carousel */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 whitespace-nowrap mt-1">
                    <span className="text-[10px] text-foreground/50 shrink-0">Sugerencias:</span>
                    {Array.from(new Set(['Trabajo', 'Externo', 'Familiar', ...existingTags]))
                      .slice(0, 7)
                      .map((tagSuggestion) => (
                        <Button
                          key={tagSuggestion}
                          type="button"
                          size="xs"
                          variant={formTag.trim().toLowerCase() === tagSuggestion.toLowerCase() ? 'primary' : 'outline'}
                          onClick={() => setFormTag(tagSuggestion)}
                          className="shrink-0 text-[10px] py-0.5 px-2 h-auto"
                        >
                          {tagSuggestion}
                        </Button>
                      ))}
                  </div>
                </div>

                {/* Case 1 vs Case 2: Interest & Model configuration */}
                <div className="bg-surface-elevated/70 border border-border rounded-2xl p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <BadgePercent className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-bold text-foreground/80">
                        Modelo de Cobro
                      </span>
                    </div>
                    <div className="flex items-center bg-surface p-0.5 rounded-xl border border-border gap-1">
                      <Button
                        type="button"
                        size="xs"
                        variant={formInterestType === 'PERCENT' ? 'primary' : 'ghost'}
                        onClick={() => {
                          setFormInterestType('PERCENT');
                          setFormHasInstallments(false);
                          const m = Math.max(1, Number(formDurationMonths) || 1);
                          setFormDueDate(dayjs(formStartDate).add(m, 'month').format('YYYY-MM-DD'));
                        }}
                      >
                        % Mensual (Caso 1)
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant={formInterestType === 'FIXED' ? 'primary' : 'ghost'}
                        onClick={() => {
                          setFormInterestType('FIXED');
                          if (!formDueDate) {
                            setFormDueDate(dayjs(formStartDate).add(15, 'day').format('YYYY-MM-DD'));
                          }
                        }}
                      >
                        $ Fijo (Caso 2)
                      </Button>
                    </div>
                  </div>

                  {/* Case 1: Interés Porcentual por Meses */}
                  {formInterestType === 'PERCENT' ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={formInterestRate}
                            onChange={(e) => setFormInterestRate(e.target.value)}
                            placeholder="10"
                            className="w-full bg-surface border border-border focus:border-primary rounded-xl px-3 py-1.5 text-sm font-mono font-bold text-white outline-none pr-14"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-accent font-bold">% mes</span>
                        </div>

                        <div className="bg-surface/80 border border-border/60 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs">
                          <span className="text-slate-400">Interés mensual:</span>
                          <span className="text-primary font-mono font-bold">+{formatCOP(calculatedFormInterest)}/mes</span>
                        </div>
                      </div>

                      {/* Plazo & Dates for Percentage Loan */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">
                            Plazo (Meses mínimo 1) *
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            required
                            value={formDurationMonths}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormDurationMonths(val);
                              const m = Math.max(1, Number(val) || 1);
                              setFormDueDate(dayjs(formStartDate).add(m, 'month').format('YYYY-MM-DD'));
                            }}
                            placeholder="1"
                            className="w-full bg-surface border border-border focus:border-primary rounded-xl px-3 py-1.5 text-xs sm:text-sm font-mono font-bold text-white outline-none"
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
                              const s = e.target.value;
                              setFormStartDate(s);
                              const m = Math.max(1, Number(formDurationMonths) || 1);
                              setFormDueDate(dayjs(s).add(m, 'month').format('YYYY-MM-DD'));
                            }}
                            className="w-full bg-surface border border-border focus:border-primary rounded-xl px-2.5 py-1.5 text-xs sm:text-sm text-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">
                            Fecha Fin (Calculada)
                          </label>
                          <input
                            type="date"
                            readOnly
                            disabled
                            value={formDueDate}
                            className="w-full bg-surface/50 border border-border rounded-xl px-2.5 py-1.5 text-xs sm:text-sm text-slate-400 outline-none cursor-not-allowed"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 italic">
                        * En interés porcentual el plazo mínimo es 1 mes. El sistema calcula automáticamente la fecha de fin y acumulará el interés mensual si no se abona oportunamente.
                      </p>
                    </div>
                  ) : (
                    /* Case 2: Interés Fijo + Cuotas Opcionales */
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formFixedInterest}
                            onChange={(e) => setFormFixedInterest(e.target.value)}
                            placeholder="Ej: 50000"
                            className="w-full bg-surface border border-border focus:border-primary rounded-xl px-3 py-1.5 text-sm font-mono font-bold text-white outline-none pr-12"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">COP</span>
                        </div>

                        <div className="bg-surface/80 border border-border/60 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs">
                          <span className="text-slate-400">Ganancia Fija:</span>
                          <span className="text-emerald-400 font-mono font-bold">+{formatCOP(calculatedFormInterest)}</span>
                        </div>
                      </div>

                      {/* Flexible Date Picker (>= today) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">
                            Fecha Inicio *
                          </label>
                          <input
                            type="date"
                            required
                            value={formStartDate}
                            onChange={(e) => setFormStartDate(e.target.value)}
                            className="w-full bg-surface border border-border focus:border-primary rounded-xl px-2.5 py-1.5 text-xs sm:text-sm text-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">
                            Fecha de Pago Acordada *
                          </label>
                          <input
                            type="date"
                            required
                            min={getTodayColombiaDate()}
                            value={formDueDate}
                            onChange={(e) => setFormDueDate(e.target.value)}
                            className="w-full bg-surface border border-border focus:border-primary rounded-xl px-2.5 py-1.5 text-xs sm:text-sm text-white outline-none"
                          />
                        </div>
                      </div>

                      {/* Dividir en Cuotas Toggle */}
                      <div className="bg-surface/60 border border-border rounded-xl p-2.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formHasInstallments}
                              onChange={(e) => setFormHasInstallments(e.target.checked)}
                              className="w-4 h-4 rounded border-border text-primary focus:ring-primary/40 bg-surface"
                            />
                            <span className="text-xs font-bold text-foreground">
                              Dividir en Cuotas
                            </span>
                          </label>
                          {formHasInstallments && (
                            <span className="text-[11px] font-mono font-bold text-accent">
                              {formInstallmentCount} cuotas de {formatCOP(Math.round(calculatedFormTotal / Math.max(1, Number(formInstallmentCount) || 1)))}
                            </span>
                          )}
                        </div>

                        {formHasInstallments && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div>
                              <label className="block text-[11px] text-slate-400 mb-1">
                                Número de Cuotas
                              </label>
                              <input
                                type="number"
                                min="2"
                                max="120"
                                value={formInstallmentCount}
                                onChange={(e) => setFormInstallmentCount(e.target.value)}
                                className="w-full bg-surface border border-border focus:border-primary rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-white outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-400 mb-1">
                                Frecuencia de Cobro
                              </label>
                              <select
                                value={formInstallmentFrequency}
                                onChange={(e: any) => setFormInstallmentFrequency(e.target.value)}
                                className="w-full bg-surface border border-border focus:border-primary rounded-xl px-2.5 py-1.5 text-xs text-white outline-none"
                              >
                                <option value="DAILY">Diaria</option>
                                <option value="WEEKLY">Semanal</option>
                                <option value="BIWEEKLY">Quincenal</option>
                                <option value="MONTHLY">Mensual</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Summary Footer */}
                  <div className="pt-2 border-t border-border/70 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-surface/50 p-2 rounded-xl border border-border/40">
                      <span className="text-[10px] text-slate-400 block">
                        {formLoanType === 'LENT' ? 'Ganancia Proyectada:' : 'Costo en Intereses:'}
                      </span>
                      <span className="text-emerald-400 font-mono font-bold text-xs sm:text-sm">
                        {formatCOP(calculatedFormProjectedInterest)}
                      </span>
                    </div>
                    <div className="bg-surface/50 p-2 rounded-xl border border-border/40">
                      <span className="text-[10px] text-amber-400 block">
                        {formLoanType === 'LENT' ? 'Total a Recoger:' : 'Total a Pagar:'}
                      </span>
                      <span className="text-amber-300 font-mono font-bold text-xs sm:text-sm">
                        {formatCOP(calculatedFormTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Account Selector with Pockets */}
                <div className="space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-400">
                        {formLoanType === 'LENT' ? 'Cuenta de Desembolso' : 'Cuenta Receptora'}
                      </label>
                      {(() => {
                        const currentMethodObj = paymentMethods.find((pm: any) => pm.name === formPaymentMethod);
                        const pocketsCount = currentMethodObj?.pockets?.length || 0;
                        if (pocketsCount === 0) return null;
                        return (
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => setShowLoanPockets(!showLoanPockets)}
                            icon={Tag}
                            className="text-primary hover:text-primary/80 py-0.5 px-2 h-auto"
                          >
                            <span>Usar bolsillo</span>
                            <Badge variant="primary" size="sm">
                              {pocketsCount}
                            </Badge>
                          </Button>
                        );
                      })()}
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 whitespace-nowrap">
                      {paymentMethods.map((pm: any) => {
                        const isSelected = formPaymentMethod === pm.name && !formPocketId;
                        const freeBal = pm.free_balance !== undefined ? pm.free_balance : (pm.net_balance ?? 0);
                        return (
                          <Button
                            key={pm.id}
                            type="button"
                            size="sm"
                            variant={isSelected ? 'primary' : 'outline'}
                            onClick={() => {
                              setFormPaymentMethod(pm.name);
                              setFormPocketId(null);
                            }}
                            className="shrink-0 font-semibold"
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: pm.color || '#00ADB5' }}
                            />
                            <span>{pm.name} • {formatCOP(freeBal)}</span>
                          </Button>
                        );
                      })}
                    </div>

                    {/* Pocket Carousel */}
                    {(() => {
                      if (!showLoanPockets) return null;
                      const currentMethodObj = paymentMethods.find((pm: any) => pm.name === formPaymentMethod);
                      const pocketsList = currentMethodObj?.pockets || [];
                      if (pocketsList.length === 0) return null;

                      return (
                        <div className="mt-2 pt-2 border-t border-border">
                          <div className="text-[11px] text-primary/80 font-medium mb-1.5 flex items-center justify-between">
                            <span>Bolsillos de {currentMethodObj?.name}:</span>
                            {formPocketId && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                onClick={() => setFormPocketId(null)}
                                className="text-[10px] text-foreground/50 hover:text-foreground underline p-0 h-auto"
                              >
                                Volver a cuenta principal
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 whitespace-nowrap">
                            {pocketsList.map((pkt: any) => {
                              const isPktSelected = formPocketId === pkt.id;
                              return (
                                <Button
                                  key={pkt.id}
                                  type="button"
                                  size="sm"
                                  variant={isPktSelected ? 'primary' : 'outline'}
                                  onClick={() => {
                                    if (isPktSelected) {
                                      setFormPocketId(null);
                                    } else {
                                      setFormPocketId(pkt.id);
                                    }
                                  }}
                                  className="shrink-0 font-semibold"
                                >
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: pkt.color || '#00ADB5' }}
                                  />
                                  <span>{pkt.name} • {formatCOP(pkt.current_balance)}</span>
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Notes */}
                  <div>
                    <Input
                      label="Notas / Condiciones"
                      type="text"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Ej: Garantía, pago quincenal, etc."
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 sm:p-4 border-t border-border bg-surface shrink-0">
                <Button
                  type="submit"
                  disabled={isSavingLoan}
                  isLoading={isSavingLoan}
                  variant={formLoanType === 'LENT' ? 'primary' : 'warning'}
                  size="lg"
                  className="w-full font-black shadow-xl"
                  icon={!isSavingLoan ? Check : undefined}
                >
                  {loanModalMode === 'edit'
                    ? 'Guardar Cambios del Préstamo'
                    : formLoanType === 'LENT'
                    ? 'Guardar Préstamo por Cobrar'
                    : 'Guardar Deuda por Pagar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR ABONO */}
      {selectedLoanForPayment && (
        <div className="fixed inset-0 z-70 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-md bg-surface border-t sm:border border-border rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <div>
                <h3 className="text-base font-black text-white">
                  {selectedLoanForPayment.loan_type === 'BORROWED' ? 'Registrar Pago de Deuda' : 'Registrar Abono'}
                </h3>
                <span className="text-xs text-primary font-semibold">
                  {selectedLoanForPayment.borrower_name}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setSelectedLoanForPayment(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Current Debt Box */}
            {(() => {
              const remCap = Number(selectedLoanForPayment.remaining_capital) || Number(selectedLoanForPayment.current_balance) || 0;
              const monthlyFee =
                selectedLoanForPayment.monthly_interest ||
                (selectedLoanForPayment.interest_rate > 0
                  ? Math.round(remCap * (selectedLoanForPayment.interest_rate / 100))
                  : Number(selectedLoanForPayment.expected_interest) || 0);
              const hasInst = Boolean(selectedLoanForPayment.has_installments);
              const instAmt = Number(selectedLoanForPayment.installment_amount) || 0;
              const amountToActivate = Number(selectedLoanForPayment.amount_to_activate) || 0;

              return (
                <>
                  <div className="bg-surface-elevated border border-border rounded-xl p-3 mb-3 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-300">
                      <span>Capital adeudado:</span>
                      <span className="font-mono font-bold text-white">{formatCOP(remCap)}</span>
                    </div>

                    {selectedLoanForPayment.interest_type === 'PERCENT' ? (
                      <div className="flex justify-between text-slate-300">
                        <span>Interés del Mes ({selectedLoanForPayment.interest_rate}%):</span>
                        <span className="font-mono font-bold text-emerald-400">+{formatCOP(monthlyFee)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-slate-300">
                        <span>{hasInst ? `Valor por Cuota (${selectedLoanForPayment.installment_count} cuotas):` : 'Ganancia Fija acordada:'}</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {hasInst ? formatCOP(instAmt) : `+${formatCOP(monthlyFee)}`}
                        </span>
                      </div>
                    )}

                    {selectedLoanForPayment.is_overdue && amountToActivate > 0 && (
                      <div className="flex justify-between text-rose-300 bg-rose-500/10 p-1.5 rounded-lg border border-rose-500/25">
                        <span className="font-semibold">Monto para ponerse al día:</span>
                        <span className="font-mono font-bold">{formatCOP(amountToActivate)}</span>
                      </div>
                    )}

                    <div className="flex justify-between font-bold pt-1 border-t border-border text-amber-300">
                      <span>Total para saldar hoy:</span>
                      <span className="font-mono">{formatCOP(remCap + (selectedLoanForPayment.interest_type === 'PERCENT' ? monthlyFee : Math.max(0, (selectedLoanForPayment.expected_interest || 0) - (selectedLoanForPayment.paid_interest || 0))))}</span>
                    </div>
                  </div>

                  {/* Shortcuts */}
                  <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                    {hasInst && instAmt > 0 && (
                      <Button
                        type="button"
                        size="xs"
                        variant={activePaymentShortcut === 'INSTALLMENT' ? 'success' : 'outline'}
                        onClick={() => {
                          // Installment splits into interest proportion and capital proportion if applicable, or all capital
                          const totalInst = instAmt;
                          const unpaidInt = Math.max(0, (Number(selectedLoanForPayment.expected_interest) || 0) - (Number(selectedLoanForPayment.paid_interest) || 0));
                          const intShare = Math.min(totalInst, Math.round(unpaidInt / Math.max(1, Number(selectedLoanForPayment.installment_count) || 1)));
                          const capShare = Math.max(0, totalInst - intShare);
                          setPayCapital(String(capShare));
                          setPayInterest(String(intShare));
                          setActivePaymentShortcut('INSTALLMENT');
                        }}
                        className="flex-1 min-w-[100px]"
                      >
                        Pagar 1 Cuota ({formatCOP(instAmt)})
                      </Button>
                    )}

                    {selectedLoanForPayment.is_overdue && amountToActivate > 0 && (
                      <Button
                        type="button"
                        size="xs"
                        variant="danger"
                        onClick={() => {
                          if (selectedLoanForPayment.overdue_reason === 'INTEREST_OVERDUE') {
                            setPayCapital('');
                            setPayInterest(String(amountToActivate));
                          } else {
                            // Installment overdue: assign to interest/capital
                            setPayCapital(String(amountToActivate));
                            setPayInterest('');
                          }
                          setActivePaymentShortcut(null);
                        }}
                        className="flex-1 min-w-[120px]"
                      >
                        Poner al Día ({formatCOP(amountToActivate)})
                      </Button>
                    )}

                    {selectedLoanForPayment.interest_type === 'PERCENT' && (
                      <Button
                        type="button"
                        size="xs"
                        variant={activePaymentShortcut === 'INTEREST_ONLY' ? 'success' : 'outline'}
                        onClick={() => {
                          setPayCapital('');
                          setPayInterest(String(monthlyFee > 0 ? monthlyFee : ''));
                          setActivePaymentShortcut('INTEREST_ONLY');
                        }}
                        className="flex-1 min-w-[90px]"
                      >
                        Solo Interés
                      </Button>
                    )}

                    <Button
                      type="button"
                      size="xs"
                      variant={activePaymentShortcut === 'SETTLE_ALL' ? 'primary' : 'outline'}
                      onClick={() => {
                        setPayCapital(String(remCap));
                        setPayInterest(String(monthlyFee > 0 ? monthlyFee : ''));
                        setActivePaymentShortcut('SETTLE_ALL');
                      }}
                      className="flex-1 min-w-[90px]"
                    >
                      Saldar Todo
                    </Button>

                    <Button
                      type="button"
                      size="xs"
                      variant={activePaymentShortcut === 'HALF_CAPITAL' ? 'warning' : 'outline'}
                      onClick={() => {
                        const half = Math.round(remCap / 2);
                        setPayCapital(String(half));
                        setPayInterest(String(monthlyFee > 0 ? monthlyFee : ''));
                        setActivePaymentShortcut('HALF_CAPITAL');
                      }}
                      className="flex-1 min-w-[90px]"
                    >
                      50% Capital
                    </Button>
                  </div>
                </>
              );
            })()}

            <form onSubmit={handleSubmitPayment} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Abono a Capital ($)"
                  type="number"
                  min="0"
                  step="500"
                  value={payCapital}
                  onChange={(e) => {
                    setPayCapital(e.target.value);
                    setActivePaymentShortcut(null);
                  }}
                  placeholder="0"
                  className="font-mono text-xs"
                />
                <Input
                  label="Interés del Mes"
                  type="number"
                  min="0"
                  step="500"
                  value={payInterest}
                  onChange={(e) => {
                    setPayInterest(e.target.value);
                    setActivePaymentShortcut(null);
                  }}
                  placeholder="0"
                  className="font-mono text-xs"
                />
              </div>

              <div className="bg-surface-elevated border border-primary/40 rounded-xl p-2.5 flex justify-between items-center text-xs">
                <span className="font-semibold text-white">Total Movimiento:</span>
                <span className="font-mono font-black text-sm text-primary">{formatCOP(calculatedTotalPayment)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Select
                  label={selectedLoanForPayment.loan_type === 'BORROWED' ? 'Cuenta de Pago' : 'Cuenta Receptora'}
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                >
                  {paymentMethods.map((pm: any) => (
                    <option key={pm.id} value={pm.name}>{pm.name}</option>
                  ))}
                  {paymentMethods.length === 0 && <option value="Nequi">Nequi</option>}
                </Select>
                <Input
                  label="Fecha del Abono"
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>

              <Input
                label="Notas / Comprobante"
                type="text"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Ej: Transferencia #4892"
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmittingPayment || calculatedTotalPayment <= 0}
                  isLoading={isSubmittingPayment}
                  variant="success"
                  size="lg"
                  className="w-full font-black shadow-xl"
                  icon={!isSubmittingPayment ? Check : undefined}
                >
                  Abonar {formatCOP(calculatedTotalPayment)}
                </Button>
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
