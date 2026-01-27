import './style.css'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import Root from './Root'

const container = document.getElementById('app')
if (!container) throw new Error('Root element #app not found')

createRoot(container).render(createElement(Root))

