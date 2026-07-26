"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Order, OrderStatus } from "@/types";
import { OrderForm } from "@/components/orders/order-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GatedButton } from "@/components/ui/gated-button";
import { useCan } from "@/hooks/use-can";
import { formatCurrency } from "@/lib/currency";
import { Check, Loader2, PackageCheck, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

const statusClasses: Record<OrderStatus, string> = {
  draft: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  confirmed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  cancelled: "border-red-500/30 bg-red-500/10 text-red-300",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function OrdersPage() {
  const t = useTranslations("Orders.page");
  const canMutate = useCan("send-messages");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search.trim()) params.set("search", search.trim());
    const res = await fetch(`/api/orders?${params.toString()}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || t("toastLoadFailed"));
      setOrders([]);
    } else {
      setOrders((json.orders ?? []) as Order[]);
    }
    setLoading(false);
  }, [search, statusFilter, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrders();
    }, 150);
    return () => window.clearTimeout(timer);
  }, [loadOrders]);

  const totals = useMemo(() => {
    return {
      count: orders.length,
      confirmed: orders.filter((o) => o.status === "confirmed").length,
      pending: orders.filter((o) => o.status === "pending").length,
    };
  }, [orders]);

  function openNewOrder() {
    setEditingOrder(null);
    setFormOpen(true);
  }

  function openEditOrder(order: Order) {
    setEditingOrder(order);
    setFormOpen(true);
  }

  async function confirmOrder(order: Order) {
    setConfirmingId(order.id);
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm" }),
    });
    const json = await res.json().catch(() => ({}));
    setConfirmingId(null);
    if (!res.ok) {
      toast.error(json.error || t("toastConfirmFailed"));
      return;
    }
    toast.success(t("toastConfirmed"));
    await loadOrders();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <GatedButton
          canAct={canMutate}
          gateReason="create orders"
          onClick={openNewOrder}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-1 h-4 w-4" />
          {t("newOrder")}
        </GatedButton>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card/60 p-4">
          <p className="text-xs text-muted-foreground">{t("totalOrders")}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{totals.count}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/60 p-4">
          <p className="text-xs text-muted-foreground">{t("pendingOrders")}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{totals.pending}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/60 p-4">
          <p className="text-xs text-muted-foreground">{t("confirmedOrders")}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{totals.confirmed}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card/60 p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="border-border bg-muted pl-9 text-foreground"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "all")}
          className="h-9 rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary"
        >
          <option value="all">{t("filterAll")}</option>
          <option value="draft">{t("statusDraft")}</option>
          <option value="pending">{t("statusPending")}</option>
          <option value="confirmed">{t("statusConfirmed")}</option>
          <option value="cancelled">{t("statusCancelled")}</option>
        </select>
      </div>

      <div className="rounded-lg border border-border bg-card/60">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <PackageCheck className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">{t("emptyTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("emptyDesc")}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columnOrder")}</TableHead>
                <TableHead>{t("columnContact")}</TableHead>
                <TableHead>{t("columnTotal")}</TableHead>
                <TableHead>{t("columnStatus")}</TableHead>
                <TableHead>{t("columnCreated")}</TableHead>
                <TableHead className="text-right">{t("columnActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <button type="button" onClick={() => openEditOrder(order)} className="text-left">
                      <span className="block font-medium text-foreground">{order.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {order.order_number || t("noOrderNumber")}
                      </span>
                    </button>
                  </TableCell>
                  <TableCell>
                    <span className="text-foreground">
                      {order.contact?.name || order.contact?.phone || t("noContact")}
                    </span>
                  </TableCell>
                  <TableCell>{formatCurrency(Number(order.total || 0), order.currency)}</TableCell>
                  <TableCell>
                    <Badge className={`border text-xs ${statusClasses[order.status]}`}>
                      {t(`status.${order.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(order.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {order.status !== "confirmed" && (
                        <Button
                          size="sm"
                          disabled={!canMutate || confirmingId === order.id}
                          onClick={() => confirmOrder(order)}
                          className="h-8 bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {confirmingId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          <span className="ml-1 hidden sm:inline">{t("confirm")}</span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditOrder(order)}
                        className="h-8 border-border bg-transparent text-foreground hover:bg-muted"
                      >
                        {t("edit")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <OrderForm
        open={formOpen}
        onOpenChange={setFormOpen}
        order={editingOrder}
        onSaved={loadOrders}
      />
    </div>
  );
}
