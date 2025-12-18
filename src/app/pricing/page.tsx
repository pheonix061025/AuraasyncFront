import React from 'react'

const coinBundles = [
  {
    id: 1,
    name: "Starter Pack",
    coins: 50,
    price: 19,
    currency: "₹"
  },
  {
    id: 2,
    name: "Small Pack",
    coins: 120,
    price: 39,
    currency: "₹"
  },
  {
    id: 3,
    name: "Value Pack",
    coins: 300,
    price: 89,
    currency: "₹"
  },
  {
    id: 4,
    name: "Power Pack",
    coins: 700,
    price: 199,
    currency: "₹"
  },
  {
    id: 5,
    name: "Mega Pack",
    coins: 1500,
    price: 399,
    currency: "₹"
  },
  {
    id: 6,
    name: "Ultra Pack",
    coins: 3000,
    price: 699,
    currency: "₹"
  }
];

const page = () => {
  return (
    <section className="relative w-full min-h-screen bg-[#0A0A0F] overflow-hidden py-20 px-6">

  {/* BACKGROUND GLOW RINGS */}
  <div className="absolute inset-0 opacity-55">
    <div className="absolute -top-40 -left-[40%] w-[900px] h-[900px] rounded-full 
      bg-[#FF9ACD] blur-[180px]" />
    
    <div className="absolute -bottom-[500px] right-0 w-[900px] h-[900px] rounded-full 
      bg-[#FF9ACD] blur-[180px]" />
  </div>

  <div className="relative z-10 max-w-7xl mx-auto text-center">
    <h2 className="text-white text-4xl md:text-5xl font-bold">
      AuraaSync Plans
    </h2>
    <p className="text-gray-300 mt-3">
      Select your AI-powered styling experience. Unlock your personal fashion aura.
    </p>

    {/* CARDS */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mt-16">
      {coinBundles.map((bundle) => (
        <div 
          key={bundle.id}
          className="rounded-3xl p-8 shadow-xl border border-[#FFFFFF]/10 
            bg-gradient-to-b from-[#1C0F1F]/60 to-[#120F1C]/60 backdrop-blur-xl 
            hover:border-[#FF8BCB]/40 transition-all duration-300"
        >
          <h3 className="text-white text-2xl font-semibold">{bundle.name}</h3>
          
          <p className="text-4xl font-bold mt-4 text-white">
            {bundle.currency}{bundle.price}
            <span className="text-lg font-medium">/one-time</span>
          </p>
          
          <p className="text-gray-400 text-sm">Get {bundle.coins} coins</p>

          <div className="text-gray-300 mt-6 space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-[#FF8BCB]">✓</span>
              <span>{bundle.coins} coins</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#FF8BCB]">✓</span>
              <span>Instant delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#FF8BCB]">✓</span>
              <span>No expiration</span>
            </div>
          </div>

          <button className="mt-8 w-full py-3 rounded-full 
            bg-gradient-to-r from-[#FF6FBC] to-[#C69CFF] 
            text-white font-medium shadow-lg shadow-[#FF6FBC]/40
            hover:shadow-lg hover:shadow-[#FF6FBC]/60 transition-all duration-300">
            Buy {bundle.coins} Coins
          </button>
        </div>
      ))}
    </div>
  </div>
</section>

  )
}

export default page
