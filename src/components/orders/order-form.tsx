"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CURRENCIES } from "@/lib/currency";
import type { Contact, Order, OrderStatus } from "@/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface OrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: Order | null;
  onSaved: () => void;
}

export function OrderForm({
  open,
  onOpenChange,
  order,
  onSaved,
}: OrderFormProps) {
  const t = useTranslations("Orders.form");
  const supabase = createClient();
  const { defaultCurrency } = useAuth();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [title, setTitle] = useState("");
  const [itemsNote, setItemsNote] = useState("");
  const [total, setTotal] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [status, setStatus] = useState<OrderStatus>("draft");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusAction, setStatusAction] = useState<OrderStatus | "confirm" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    if (order) {
      setContactId(order.contact_id ?? "");
      setOrderNumber(order.order_number ?? "");
      setTitle(order.title);
      setItemsNote(order.items_note ?? "");
      setTotal(String(order.total ?? ""));
      setCurrency(order.currency || defaultCurrency);
      setStatus(order.status);
      setNotes(order.notes ?? "");
    } else {
      setContactId("");
      setOrderNumber("");
      setTitle("");
      setItemsNote("");
      setTotal("");
      setCurrency(defaultCurrency);
      setStatus("draft");
      setNotes("");
    }
  }, [open, order, defaultCurrency]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("name");
      if (cancelled) return;
      if (error) {
        console.error("Failed to load contacts:", error.message);
        setContacts([]);
      } else {
        setContacts((data ?? []) as Contact[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, supabase]);

  async function handleSave() {
    if (!title.trim()) {
      toast.error(t("toastTitleRequired"));
      return;
    }
    setSaving(true);
    const payload = {
      contact_id: contactId || null,
      order_number: orderNumber,
      title,
      items_note: itemsNote,
      total,
      currency,
      status,
      notes,
    };
    const res = await fetch(order ? `/api/orders/${order.id}` : "/api/orders", {
      method: order ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      toast.error(json.error || t("toastSaveFailed"));
      return;
    }
    toast.success(order ? t("toastUpdated") : t("toastCreated"));
    onOpenChange(false);
    onSaved();
  }

  async function updateStatus(nextStatus: OrderStatus | "confirm") {
    if (!order) return;
    setStatusAction(nextStatus);
    const body =
      nextStatus === "confirm"
        ? { action: "confirm" }
        : { action: "set_status", status: nextStatus };
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setStatusAction(null);
    if (!res.ok) {
      toast.error(json.error || t("toastStatusFailed"));
      return;
    }
    toast.success(nextStatus === "confirm" ? t("toastConfirmed") : t("toastStatusUpdated"));
    onOpenChange(false);
    onSaved();
  }

  async function handleDelete() {
    if (!order) return;
    setDeleting(true);
    const res = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setDeleting(false);
    if (!res.ok) {
      toast.error(json.error || t("toastDeleteFailed"));
      return;
    }
    toast.success(t("toastDeleted"));
    onOpenChange(false);
    onSaved();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full bg-popover p-0 text-popover-foreground sm:max-w-lg">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-border/50 p-4">
            <SheetTitle className="text-popover-foreground">
              {order ? t("editOrder") : t("newOrder")}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div className="grid gap-2">
              <Label className="text-muted-foreground">{t("contact")}</Label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="">{t("selectContact")}</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name || contact.phone}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label className="text-muted-foreground">{t("title")}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="border-border bg-muted text-foreground" />
            </div>

            <div className="grid gap-2">
              <Label className="text-muted-foreground">{t("orderNumber")}</Label>
              <Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder={t("orderNumberPlaceholder")} className="border-border bg-muted text-foreground" />
            </div>

            <div className="grid grid-cols-[1fr_110px] gap-3">
              <div className="grid gap-2">
                <Label className="text-muted-foreground">{t("total")}</Label>
                <Input type="number" min="0" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} className="border-border bg-muted text-foreground" />
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">{t("currency")}</Label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-muted-foreground">{t("status")}</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="h-9 w-full rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="draft">{t("statusDraft")}</option>
                <option value="pending">{t("statusPending")}</option>
                <option value="confirmed">{t("statusConfirmed")}</option>
                <option value="cancelled">{t("statusCancelled")}</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label className="text-muted-foreground">{t("itemsNote")}</Label>
              <Textarea value={itemsNote} onChange={(e) => setItemsNote(e.target.value)} className="min-h-[110px] border-border bg-muted text-foreground" />
            </div>

            <div className="grid gap-2">
              <Label className="text-muted-foreground">{t("notes")}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[90px] border-border bg-muted text-foreground" />
            </div>

            {order && (
              <div className="space-y-2 rounded-lg border border-border bg-muted/50 p-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("statusActions")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    onClick={() => updateStatus("confirm")}
                    disabled={!!statusAction || order.status === "confirmed"}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {statusAction === "confirm" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-1 h-4 w-4" />{t("confirmOrder")}</>}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => updateStatus("cancelled")}
                    disabled={!!statusAction || order.status === "cancelled"}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    {statusAction === "cancelled" ? <Loader2 className="h-4 w-4 animate-spin" /> : <><X className="mr-1 h-4 w-4" />{t("cancelOrder")}</>}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border/50 bg-popover/80 p-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 border-border bg-transparent text-muted-foreground hover:bg-muted">
                {t("cancel")}
              </Button>
              <Button onClick={handleSave} disabled={saving || !title.trim()} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                {saving ? t("saving") : order ? t("saveChanges") : t("createOrder")}
              </Button>
            </div>
            {order && (confirmDelete ? (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs">
                <span className="text-red-300">{t("deletePrompt")}</span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting} className="rounded px-2 py-1 text-muted-foreground hover:bg-muted">
                    {t("cancel")}
                  </button>
                  <button type="button" onClick={handleDelete} disabled={deleting} className="rounded bg-red-600 px-2 py-1 font-medium text-white hover:bg-red-700 disabled:opacity-50">
                    {deleting ? t("deleting") : t("confirm")}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="mt-3 flex w-full items-center justify-center gap-1 text-xs text-red-400 hover:text-red-300">
                <Trash2 className="h-3 w-3" />
                {t("deleteOrder")}
              </button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
