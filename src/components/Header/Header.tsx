import './header.css'

type HeaderProps = {
  title: string
}

function Header({ title }: HeaderProps) {
  return (
    <header>
  <section className="appHeader">
    <h1> {title} </h1>
  </section>

  <section className="chooseAccount">
    <p>Seleccionar cuenta</p>
  </section>
  </header>

)}

export default Header
