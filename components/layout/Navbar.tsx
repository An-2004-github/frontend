"use client"

import Link from "next/link"
import Button from "@/components/ui/button"

export default function Navbar() {
    return (
        <nav className="w-full border-b bg-white">
            <div className="max-w-6xl mx-auto flex justify-between items-center p-4">

                {/* Logo */}
                <Link href="/" className="text-xl font-bold text-blue-600">
                    TravelBooking
                </Link>

                {/* Menu */}
                <div className="flex gap-6 text-sm">
                    <Link href="/destinations">Destinations</Link>
                    <Link href="/hotels">Hotels</Link>
                    <Link href="/flights">Flights</Link>
                    <Link href="/trains">Trains</Link>
                    <Link href="/buses">Buses</Link>
                </div>

                {/* Auth */}
                <div className="flex gap-2">
                    <Link href="/login">
                        <Button variant="secondary">Login</Button>
                    </Link>

                    <Link href="/register">
                        <Button>Register</Button>
                    </Link>
                </div>
            </div>
        </nav>
    )
}