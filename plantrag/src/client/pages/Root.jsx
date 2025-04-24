import { Outlet } from 'react-router-dom'

export default function Root() {
  return (
    <div>
      <header>
        <h1>Botanical Buddy</h1>
      </header>
      <Outlet />
      <footer>
        <p>Botanical Buddy</p>
      </footer>
    </div>
  )
}

