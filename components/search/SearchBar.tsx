"use client"

export default function SearchBar() {

    return (

        <div className="bg-white rounded-xl shadow-lg p-4 flex gap-3">

            <input
                type="text"
                placeholder="Where are you going?"
                className="border rounded-lg p-3 flex-1"
            />

            <input
                type="date"
                className="border rounded-lg p-3"
            />

            <button className="bg-blue-600 text-white px-6 rounded-lg hover:bg-blue-700">
                Search
            </button>

        </div>

    )

}