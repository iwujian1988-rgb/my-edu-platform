'use client'

import React from 'react'
import { Ghost } from 'lucide-react'
import Link from 'next/link'

const EmptyState = () => (
  <div className="w-full h-64 border-[3px] border-black border-dashed rounded-xl bg-gray-50 flex flex-col items-center justify-center gap-4 relative overflow-hidden group">
    <div className="absolute inset-0 opacity-10"
         style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
    </div>
    <div className="w-20 h-20 bg-white border-[3px] border-black rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_#000] group-hover:scale-110 transition-transform duration-300">
      <Ghost size={40} className="text-black" />
    </div>
    <div className="text-center z-10">
      <h3 className="text-xl font-black text-black mb-1">空空如也</h3>
      <p className="text-sm font-bold text-gray-500">还没有访问过任何词库</p>
    </div>
    <Link href="/library">
      <button className="mt-2 px-6 py-2 bg-[#B4F416] border-2 border-black rounded-lg font-black text-sm shadow-[2px_2px_0px_0px_#000] hover:translate-y-0.5 hover:shadow-none transition-all">
        去探索词库 →
      </button>
    </Link>
  </div>
)

export default EmptyState
