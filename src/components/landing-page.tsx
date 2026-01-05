'use client'
import './landing-page.css'

import { GraduationCap, Sparkles, Zap, Target, Play, Star, BookOpen, Users, TrendingUp, Award } from 'lucide-react'

/**
 * Playful Educational Platform Landing Page
 * Claymorphism Design System
 *
 * CSS Values from ui-ux-pro-max search:
 * - Border-radius: 16-24px (rounded)
 * - Border: 3-4px thick borders
 * - Shadows: Inner + outer (subtle, no hard lines)
 * - Colors: Pastel (Soft Peach #FDBCB4, Baby Blue #ADD8E6, Mint #98FF98, Lilac #E6E6FA)
 * - Fonts: Fredoka (heading) + Nunito (body)
 * - Animation: 200ms ease-out soft press
 */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-blue-50">
      {/* ========== HEADER SECTION ========== */}
      <header className="sticky top-4 left-4 right-4 z-50 max-w-7xl mx-auto">
        <nav className="clay-nav">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="clay-icon-wrapper clay-icon-orange">
                <GraduationCap className="h-7 w-7 text-orange-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Fredoka, sans-serif' }}>
                  LearnPlay
                </h1>
                <p className="text-xs font-semibold text-gray-600" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  Learn with fun!
                </p>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-3">
              <a href="#courses" className="clay-nav-link clay-nav-link-orange">Courses</a>
              <a href="#progress" className="clay-nav-link clay-nav-link-pink">Progress</a>
              <a href="#testimonials" className="clay-nav-link clay-nav-link-blue">Reviews</a>
              <button className="clay-button-primary">
                Start Learning
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* ========== HERO SECTION ========== */}
      <main className="container mx-auto px-4 pt-16 pb-24">
        <section className="max-w-6xl mx-auto text-center">
          {/* Floating Feature Badges */}
          <div className="mb-8 flex flex-wrap justify-center gap-4">
            <div className="clay-badge clay-badge-orange animate-float">
              <Sparkles className="h-5 w-5 text-orange-600" />
              <span className="font-bold text-gray-800">AI Smart Tutor</span>
            </div>
            <div className="clay-badge clay-badge-pink animate-float-delayed">
              <Zap className="h-5 w-5 text-pink-600" />
              <span className="font-bold text-gray-800">Memory Science</span>
            </div>
            <div className="clay-badge clay-badge-green animate-float">
              <Target className="h-5 w-5 text-green-600" />
              <span className="font-bold text-gray-800">Achievement System</span>
            </div>
          </div>

          {/* Main Hero Heading */}
          <h2 className="mb-6 text-6xl font-black text-gray-900 leading-tight sm:text-7xl lg:text-8xl" style={{ fontFamily: 'Fredoka, sans-serif' }}>
            Start Your
            <br />
            <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-blue-500 bg-clip-text text-transparent">
              Learning Adventure
            </span>
            <span className="inline-block animate-bounce">🚀</span>
          </h2>

          {/* Hero Subheading */}
          <p className="mb-10 text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed font-semibold" style={{ fontFamily: 'Nunito, sans-serif' }}>
            Learn like playing games! Just 20 minutes a day,科学的记忆曲线让每个单词都牢牢记在脑子里
            <br />
            <span className="text-orange-600 font-bold">12,000+ students already learning with us ✨</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button className="clay-button clay-button-orange text-xl px-8 py-4 inline-flex items-center gap-3 cursor-pointer">
              <Play className="h-6 w-6" />
              Start Free Learning
            </button>
            <button className="clay-button-secondary text-lg px-6 py-4 inline-flex items-center gap-2 cursor-pointer">
              <Star className="h-5 w-5 fill-current text-yellow-500" />
              <span className="font-bold">View Courses</span>
            </button>
          </div>

          {/* Stats Cards - Claymorphism Style */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <StatCard
              icon={BookOpen}
              value="50,000+"
              label="Words"
              color="orange"
            />
            <StatCard
              icon={Users}
              value="12,000+"
              label="Students"
              color="pink"
            />
            <StatCard
              icon={TrendingUp}
              value="89%"
              label="Improvement"
              color="green"
            />
            <StatCard
              icon={Award}
              value="4.9/5"
              label="Rating"
              color="blue"
            />
          </div>
        </section>
      </main>
    </div>
  )
}

// ========== COMPONENTS ==========

// Stat Card with Claymorphism
function StatCard({
  icon: Icon,
  value,
  label,
  color
}: {
  icon: any
  value: string
  label: string
  color: 'orange' | 'pink' | 'green' | 'blue'
}) {
  const colorClasses = {
    orange: 'clay-card-orange',
    pink: 'clay-card-pink',
    green: 'clay-card-green',
    blue: 'clay-card-blue'
  }

  return (
    <div className={`${colorClasses[color]} clay-card p-6 text-center`}>
      <div className={`clay-icon-wrapper clay-icon-${color} h-16 w-16 mx-auto mb-4 animate-float`}>
        <Icon className="h-8 w-8 text-gray-700" />
      </div>
      <p className="text-4xl font-black text-gray-900 mb-2" style={{ fontFamily: 'Fredoka, sans-serif' }}>
        {value}
      </p>
      <p className="text-sm font-bold text-gray-600" style={{ fontFamily: 'Nunito, sans-serif' }}>
        {label}
      </p>
    </div>
  )
}
