import { hasPermission } from "@/lib/rbac";

/** Entity keys aligned with backend `ALL_PERMISSIONS` (create_x, edit_x, delete_x). */
export type CrudResource =
    | "account"
    | "contact"
    | "lead"
    | "opportunity"
    | "task"
    | "event"
    | "note"
    | "file"
    | "supplier"
    | "destination"
    | "hierarchy"
    | "itinerary"
    | "package"
    | "product"
    | "quote"
    | "invoice"
    | "user"
    | "role"
    | "report"
    | "webhook"
    | "email"
    | "email_template"
    | "sales_stage"
    | "incentive"
    | "sales_target";

const CRUD_KEYS: Record<
    CrudResource,
    { create: string; edit: string; delete: string }
> = {
    account: {
        create: "create_account",
        edit: "edit_account",
        delete: "delete_account",
    },
    contact: {
        create: "create_contact",
        edit: "edit_contact",
        delete: "delete_contact",
    },
    lead: {
        create: "create_lead",
        edit: "edit_lead",
        delete: "delete_lead",
    },
    opportunity: {
        create: "create_opportunity",
        edit: "edit_opportunity",
        delete: "delete_opportunity",
    },
    task: {
        create: "create_task",
        edit: "edit_task",
        delete: "delete_task",
    },
    event: {
        create: "create_event",
        edit: "edit_event",
        delete: "delete_event",
    },
    note: {
        create: "create_note",
        edit: "edit_note",
        delete: "delete_note",
    },
    file: {
        create: "upload_file",
        edit: "upload_file",
        delete: "delete_file",
    },
    supplier: {
        create: "create_supplier",
        edit: "edit_supplier",
        delete: "delete_supplier",
    },
    destination: {
        create: "create_destination",
        edit: "edit_destination",
        delete: "delete_destination",
    },
    hierarchy: {
        create: "create_hierarchy",
        edit: "edit_hierarchy",
        delete: "delete_hierarchy",
    },
    itinerary: {
        create: "create_itinerary",
        edit: "edit_itinerary",
        delete: "delete_itinerary",
    },
    package: {
        create: "create_package",
        edit: "edit_package",
        delete: "delete_package",
    },
    product: {
        create: "create_product",
        edit: "edit_product",
        delete: "delete_product",
    },
    quote: {
        create: "create_quote",
        edit: "edit_quote",
        delete: "delete_quote",
    },
    invoice: {
        create: "create_invoice",
        edit: "edit_invoice",
        delete: "delete_invoice",
    },
    user: {
        create: "create_user",
        edit: "edit_user",
        delete: "delete_user",
    },
    role: {
        create: "create_role",
        edit: "edit_role",
        delete: "delete_role",
    },
    report: {
        create: "create_report",
        edit: "edit_report",
        delete: "delete_report",
    },
    webhook: {
        create: "create_webhook",
        edit: "edit_webhook",
        delete: "delete_webhook",
    },
    email: {
        create: "create_email",
        edit: "edit_email",
        delete: "delete_email",
    },
    email_template: {
        create: "create_email_template",
        edit: "edit_email_template",
        delete: "delete_email_template",
    },
    sales_stage: {
        create: "manage_sales_stages",
        edit: "manage_sales_stages",
        delete: "manage_sales_stages",
    },
    incentive: {
        create: "manage_incentives",
        edit: "manage_incentives",
        delete: "manage_incentives",
    },
    sales_target: {
        create: "manage_sales_targets",
        edit: "manage_sales_targets",
        delete: "manage_sales_targets",
    },
};

export function getCrudPermissions(
    permissions: string[] | undefined,
    resource: CrudResource
): { canCreate: boolean; canEdit: boolean; canDelete: boolean } {
    const keys = CRUD_KEYS[resource];
    return {
        canCreate: hasPermission(permissions, keys.create),
        canEdit: hasPermission(permissions, keys.edit),
        canDelete: hasPermission(permissions, keys.delete),
    };
}
