"use client"

import SearchBar from "@/components/search/SearchBar"

export default function HomePage() {

  return (

    <div>

      {/* HERO */}
      <section className="bg-['@/public/images/bg.jpg'] bg-cover bg-center text-white py-24"> </section>
      <section className="bg-gradient-to-r from-blue-700 to-blue-500 text-white py-24">

        <div className="max-w-6xl mx-auto px-6">

          <h1 className="text-4xl font-bold mb-3">
            Discover Your Next Adventure
          </h1>

          <p className="mb-8">
            Book hotels, flights, trains and buses in one place
          </p>

          <SearchBar />

        </div>

      </section>


      {/* SERVICES */}

      <section className="max-w-6xl mx-auto px-6 py-14">

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">

          <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
            ✈
            <p className="mt-2 font-semibold">Flights</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
            🏨
            <p className="mt-2 font-semibold">Hotels</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
            🚆
            <p className="mt-2 font-semibold">Trains</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition">
            🚌
            <p className="mt-2 font-semibold">Buses</p>
          </div>

        </div>

      </section>


      {/* POPULAR DESTINATIONS */}

      <section className="max-w-6xl mx-auto px-6 py-10">

        <h2 className="text-2xl font-bold mb-6">
          Popular Destinations
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

          <div className="bg-white rounded-xl shadow p-6">Paris</div>
          <div className="bg-white rounded-xl shadow p-6">Tokyo</div>
          <div className="bg-white rounded-xl shadow p-6">Singapore</div>
          <div className="bg-white rounded-xl shadow p-6">Bangkok</div>

        </div>

      </section>


      {/* POPULAR HOTELS */}

      <section className="max-w-6xl mx-auto px-6 py-10">

        <h2 className="text-2xl font-bold mb-6">
          Popular Hotels
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

          <div className="bg-white rounded-xl shadow p-4">
            <p className="font-semibold">Hotel Paradise</p>
            <p className="text-sm text-gray-500">$120 / night</p>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <p className="font-semibold">City Hotel</p>
            <p className="text-sm text-gray-500">$95 / night</p>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <p className="font-semibold">Beach Resort</p>
            <p className="text-sm text-gray-500">$200 / night</p>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <p className="font-semibold">Mountain Lodge</p>
            <p className="text-sm text-gray-500">$150 / night</p>
          </div>

        </div>

      </section>

    </div>

  )

}