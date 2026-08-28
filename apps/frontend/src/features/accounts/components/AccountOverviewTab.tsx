import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";


interface AccountOverviewTabProps {
    account: any;
}

export function AccountOverviewTab({ account }: AccountOverviewTabProps) {
    const isB2C = account.is_person_account;

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Account Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Account Name</p>
                        <p className="text-sm">{account.name}</p>
                    </div>

                    {!isB2C && (
                        <>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Account Type</p>
                                <p className="text-sm">{account.account_type_name || "-"}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Parent Account</p>
                                <p className="text-sm">{account.parent_account_name || "-"}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Industry</p>
                                <p className="text-sm">{account.industry_name || "-"}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Category</p>
                                <p className="text-sm">{account.category_name || "-"}</p>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">
                            Email
                        </label>
                        <p className="text-sm">{account.email || "-"}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">
                            Phone
                        </label>
                        <p className="text-sm">{account.phone || "-"}</p>
                    </div>
                    {isB2C && (
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">
                                Mobile
                            </label>
                            <p className="text-sm">{account.mobile || "-"}</p>
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">
                            Website
                        </label>
                        <p className="text-sm">
                            {account.website ? (
                                <a
                                    href={account.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    {account.website}
                                </a>
                            ) : (
                                "-"
                            )}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">
                            Owner
                        </label>
                        <p className="text-sm">{account.owner_name}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Billing Address */}
            <Card>
                <CardHeader>
                    <CardTitle>Billing Address</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm space-y-1">
                        {account.billing_street && <p>{account.billing_street}</p>}
                        {(account.billing_city || account.billing_state || account.billing_zip) && (
                            <p>
                                {[account.billing_city, account.billing_state, account.billing_zip]
                                    .filter(Boolean)
                                    .join(", ")}
                            </p>
                        )}
                        {account.billing_country && <p>{account.billing_country}</p>}
                        {!account.billing_street &&
                            !account.billing_city &&
                            !account.billing_state &&
                            !account.billing_zip &&
                            !account.billing_country && <p className="text-muted-foreground">-</p>}
                    </div>
                </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
                <CardHeader>
                    <CardTitle>Shipping Address</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm space-y-1">
                        {account.shipping_street && <p>{account.shipping_street}</p>}
                        {(account.shipping_city || account.shipping_state || account.shipping_zip) && (
                            <p>
                                {[account.shipping_city, account.shipping_state, account.shipping_zip]
                                    .filter(Boolean)
                                    .join(", ")}
                            </p>
                        )}
                        {account.shipping_country && <p>{account.shipping_country}</p>}
                        {!account.shipping_street &&
                            !account.shipping_city &&
                            !account.shipping_state &&
                            !account.shipping_zip &&
                            !account.shipping_country && <p className="text-muted-foreground">-</p>}
                    </div>
                </CardContent>
            </Card>

            {/* Description */}
            {account.description && (
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm">{account.description}</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
