import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function AuthRedirectPage() {
    const session = await auth()
    const role = session?.user?.role

    if (!session?.user) {
        redirect("/login")
    }

    switch (role) {
        case "SUPER_ADMIN":
            redirect("/super-admin")
            break
        case "MIDDLE_ADMIN":
            redirect("/middle-admin")
            break
        case "LOW_ADMIN":
            redirect("/low-admin")
            break
        case "COURIER":
            redirect("/courier")
            break
        default:
            redirect("/middle-admin")
            break
    }
}
