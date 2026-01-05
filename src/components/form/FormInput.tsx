/**
 * FormInput - 标准输入框组件
 *
 * 符合 iPad First 规范的输入框
 * 最小高度 56px，适合触摸操作
 */

import React from 'react'

interface FormInputProps {
  label: string
  icon?: React.ReactNode
  type?: 'text' | 'email' | 'tel' | 'password'
  placeholder: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  name?: string
  autoComplete?: string
}

export function FormInput({
  label,
  icon,
  type = 'text',
  placeholder,
  value,
  onChange,
  required = false,
  name,
  autoComplete
}: FormInputProps) {
  return (
    <div>
      <label className="block text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
        {icon && <span className="w-5 h-5">{icon}</span>}
        {label}
        {required && <span style={{ color: '#FF8C61' }}>*</span>}
      </label>
      <div className="clay-icon px-5 py-4" style={{ minHeight: '56px' }}>
        <input
          type={type}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full bg-transparent border-none outline-none
                         text-gray-800 placeholder-gray-400
                         font-semibold text-lg"
          required={required}
        />
      </div>
    </div>
  )
}
