export default function Footer() {
    return (
        <footer className="border-t mt-10 bg-gray-50">
            <div className="max-w-6xl mx-auto p-6 text-sm text-gray-600 flex justify-between">

                <div>
                    <p className="font-semibold">TravelBooking</p>
                    <p>Online travel booking platform</p>
                </div>

                <div>
                    <p>© {new Date().getFullYear()} TravelBooking</p>
                </div>

            </div>
        </footer>
    )
}