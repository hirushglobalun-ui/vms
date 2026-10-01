import React from 'react';
import { Badge } from '@/components/ui/badge';
import { RenewalStatus, TaskPriority, TaskStatus } from '@/lib/types';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Hourglass } from 'lucide-react';

export function RenewalStatusBadge({ status }: { status: RenewalStatus }) {
  switch (status) {
    case 'OVERDUE':
      return (
        <Badge variant="danger" className="gap-1 font-semibold">
          <AlertCircle className="w-3.5 h-3.5" />
          OVERDUE
        </Badge>
      );
    case 'DUE_TODAY':
      return (
        <Badge variant="danger" className="gap-1 font-bold animate-pulse">
          <AlertCircle className="w-3.5 h-3.5" />
          DUE TODAY
        </Badge>
      );
    case 'DUE_SOON':
      return (
        <Badge variant="warning" className="gap-1 font-semibold">
          <AlertTriangle className="w-3.5 h-3.5" />
          DUE SOON
        </Badge>
      );
    case 'ACTIVE':
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          ACTIVE
        </Badge>
      );
    case 'COMPLETED':
      return (
        <Badge variant="info" className="gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          COMPLETED
        </Badge>
      );
    default:
      return <Badge>{status}</Badge>;
  }
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  switch (status) {
    case 'PENDING':
      return (
        <Badge variant="warning" className="gap-1">
          <Clock className="w-3 h-3" />
          PENDING
        </Badge>
      );
    case 'CLIENT_CONTACTED':
      return (
        <Badge variant="info" className="gap-1">
          <Hourglass className="w-3 h-3" />
          CLIENT CONTACTED
        </Badge>
      );
    case 'PROCESSING':
      return (
        <Badge variant="default" className="gap-1 bg-purple-50 text-purple-700 border-purple-200">
          <Hourglass className="w-3 h-3" />
          PROCESSING
        </Badge>
      );
    case 'COMPLETED':
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="w-3 h-3" />
          COMPLETED
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant="secondary" className="gap-1">
          CANCELLED
        </Badge>
      );
    case 'WAITING_FOR_DOCUMENT':
      return (
        <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700">
          WAITING FOR DOC
        </Badge>
      );
    case 'CLIENT_NOT_RESPONDING':
      return (
        <Badge variant="danger" className="gap-1">
          NOT RESPONDING
        </Badge>
      );
    default:
      return <Badge>{status}</Badge>;
  }
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  switch (priority) {
    case 'HIGH':
      return <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">HIGH</span>;
    case 'NORMAL':
      return <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">NORMAL</span>;
    case 'LOW':
      return <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">LOW</span>;
    default:
      return null;
  }
}
