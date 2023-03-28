import '../styles/globals.css'
import '../styles/App.css'
import '../styles/CommandBar.css'
import '../styles/Terminal.css'
import '../styles/Window.css'
import '../styles/LoginModal.css'
import "react-mde/lib/styles/css/react-mde-all.css";
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
