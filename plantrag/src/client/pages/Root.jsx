import { Outlet } from 'react-router-dom'

export default function Root() {
  return (
    <div>
      <header>
        <h1>Botani-Buddy</h1>
      </header>
      <Outlet />
      <footer>
        <p>Botani-Buddy</p>
      </footer>
    </div>
  )
}

