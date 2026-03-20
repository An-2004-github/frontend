import ProfileLayout from "@/components/profile/ProfileLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
    return <ProfileLayout>{children}</ProfileLayout>;
}