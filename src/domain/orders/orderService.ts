import { eq } from 'drizzle-orm';
import { getDb, withTransaction } from '../../db/index.ts';
import { feedOrders } from '../../db/schema.ts';
import { logAuditEvent } from '../../server/services/auditService.ts';

export type OrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PRODUCTION_PENDING'
  | 'READY'
  | 'ASSIGNED_TO_DRIVER'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CONFIRMED'
  | 'CANCELLED';

export interface StateTransitionRule {
  allowedFrom: OrderStatus[];
  allowedRoles: string[];
  description: string;
}

export const ORDER_TRANSITION_RULES: Record<string, StateTransitionRule> = {
  SUBMIT: {
    allowedFrom: ['DRAFT'],
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_MANAGER', 'FARMER'],
    description: 'ارسال سفارش جهت بررسی و تأیید بازرگانی',
  },
  APPROVE: {
    allowedFrom: ['SUBMITTED', 'PENDING_APPROVAL'],
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_MANAGER'],
    description: 'تأیید بازرگانی و مالی سفارش',
  },
  REJECT: {
    allowedFrom: ['SUBMITTED', 'PENDING_APPROVAL'],
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_MANAGER'],
    description: 'رد سفارش به دلیل مسائل اعتباری یا سقف بدهی',
  },
  SCHEDULE: {
    allowedFrom: ['APPROVED'],
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PRODUCTION_MANAGER'],
    description: 'برنامه‌ریزی سفارش در صف خط تولید',
  },
  PRODUCE: {
    allowedFrom: ['PRODUCTION_PENDING'],
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PRODUCTION_MANAGER'],
    description: 'اعلام پایان فرآیند پلت‌سازی و آماده بودن بار',
  },
  ASSIGN_DRIVER: {
    allowedFrom: ['APPROVED', 'READY'],
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SCALE_OPERATOR'],
    description: 'تخصیص سفارش به راننده و ناوگان حمل',
  },
  LOAD_TRUCK: {
    allowedFrom: ['READY', 'ASSIGNED_TO_DRIVER'],
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SCALE_OPERATOR'],
    description: 'بارگیری در کامیون و صدور بارنامه',
  },
  DISPATCH: {
    allowedFrom: ['PICKED_UP'],
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SCALE_OPERATOR', 'DRIVER'],
    description: 'خروج کامیون از درب کارخانه به سمت مقصد',
  },
  DELIVER: {
    allowedFrom: ['IN_TRANSIT'],
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DRIVER'],
    description: 'رسیدن به مرغداری و تخلیه در سیلوها',
  },
  CONFIRM: {
    allowedFrom: ['DELIVERED', 'IN_TRANSIT'],
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FARMER', 'SCALE_OPERATOR'],
    description: 'تأیید نهایی مرغدار با امضا یا کد OTP',
  },
  CANCEL: {
    allowedFrom: ['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED'],
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FARMER'],
    description: 'لغو سفارش قبل از بارگیری',
  },
};

export const ACTION_TO_TARGET_STATE: Record<string, OrderStatus> = {
  SUBMIT: 'SUBMITTED',
  APPROVE: 'APPROVED',
  REJECT: 'REJECTED',
  SCHEDULE: 'PRODUCTION_PENDING',
  PRODUCE: 'READY',
  ASSIGN_DRIVER: 'ASSIGNED_TO_DRIVER',
  LOAD_TRUCK: 'PICKED_UP',
  DISPATCH: 'IN_TRANSIT',
  DELIVER: 'DELIVERED',
  CONFIRM: 'CONFIRMED',
  CANCEL: 'CANCELLED',
};

/**
 * Transitions an order state adhering strictly to the state machine rules and RBAC roles.
 */
export async function transitionOrderStatus(params: {
  orderId: string;
  action: string;
  userRole: string;
  userId: string;
  userPhone?: string;
  farmerId?: string | null;
  notes?: string;
  requestId?: string;
}) {
  const { orderId, action, userRole, userId, userPhone, farmerId, notes, requestId } = params;

  const rule = ORDER_TRANSITION_RULES[action];
  const targetState = ACTION_TO_TARGET_STATE[action];

  if (!rule || !targetState) {
    throw new Error(`اقدام نامعتبر در گردش کار: ${action}`);
  }

  // 1. Role verification
  if (!rule.allowedRoles.includes(userRole) && userRole !== 'SUPER_ADMIN') {
    throw new Error(`شما با نقش ${userRole} مجاز به انجام اقدام ${action} نیستید.`);
  }

  const db = await getDb();
  const existing = await db.select().from(feedOrders).where(eq(feedOrders.id, orderId));
  if (!existing[0]) {
    throw new Error('سفارش مورد نظر یافت نشد.');
  }

  const order = existing[0];

  // 2. State boundary check
  if (!rule.allowedFrom.includes(order.status as OrderStatus)) {
    throw new Error(`امکان انتقال سفارش از وضعیت ${order.status} با اقدام ${action} وجود ندارد.`);
  }

  // 3. Object-level authorization for farmers
  if (userRole === 'FARMER' && farmerId && order.farmerId !== farmerId) {
    throw new Error('شما تنها مجاز به تغییر وضعیت سفارشات مرغداری خود هستید.');
  }

  return withTransaction(async (tx) => {
    const updatePayload: any = {
      status: targetState,
      updatedAt: new Date(),
    };

    if (action === 'APPROVE') {
      updatePayload.approvedBy = userId;
      updatePayload.approvedAt = new Date();
    }
    if (notes) {
      updatePayload.notes = order.notes ? `${order.notes}\n[${action}]: ${notes}` : notes;
    }

    await tx.update(feedOrders).set(updatePayload).where(eq(feedOrders.id, orderId));

    await logAuditEvent({
      userId,
      userPhone,
      action: `ORDER_STATE_${action}`,
      entityType: 'feed_orders',
      entityId: orderId,
      oldState: { status: order.status },
      newState: { status: targetState, notes },
      requestId,
    });

    return {
      orderId,
      previousStatus: order.status,
      newStatus: targetState,
    };
  });
}
