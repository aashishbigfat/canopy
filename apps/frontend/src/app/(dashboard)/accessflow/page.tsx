import { redirect } from "next/navigation";

/** Landing for the AccessFlow sidebar parent link; main navigation uses the submenu. */
export default function AccessFlowPage() {
    redirect("/accounts");
}
