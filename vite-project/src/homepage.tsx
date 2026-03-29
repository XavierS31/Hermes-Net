import { useNavigate } from 'react-router-dom'
import './App.css'
import hermesLogo from './assets/hermeslogo.png'

const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260217_030345_246c0224-10a4-422c-b324-070b7c0eceda.mp4'

/** Black inner pill, white outer hairline, top glow — navbar variant */
function DeveloperTeamButton({ className = '' }) {
  return (
    <button
      type="button"
      className={`pill-btn pill-btn--dark ${className}`.trim()}
    >
      <span className="pill-btn__glow" aria-hidden="true" />
      <span className="pill-btn__outer">
        <span className="pill-btn__inner pill-btn__inner--dark">
          <span className="pill-btn__label">Developer Team</span>
        </span>
      </span>
    </button>
  )
}

/** Black inner pill, white outer hairline, top glow — navbar variant */
function ButtonSimulate({ className = '' }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      className={`pill-btn pill-btn--dark pill-btn--lg ${className}`.trim()}
      onClick={() => navigate('/simulate')}
    >
      <span className="pill-btn__glow" aria-hidden="true" />
      <span className="pill-btn__outer">
        <span className="pill-btn__inner pill-btn__inner--dark">
          <span className="pill-btn__label">Simulate</span>
        </span>
      </span>
    </button>
  )
}

export default function HomePage() {
  return (
    <div className="landing">
      <div className="landing__media" aria-hidden="true">
        <video
          className="landing__video"
          src={VIDEO_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
        <div className="landing__overlay" />
      </div>

      <div className="landing__stack">
        <header className="nav">
          <div className="nav__inner">
            <div className="nav__left">
              <a href="/" className="nav__logo" aria-label="Hermes home">
                <img
                  src={hermesLogo}
                  alt=""
                  className="nav__logo-img"
                  width={260}
                  height={35}
                />
              </a>
              <nav className="nav__links" aria-label="Main" />
            </div>
            <DeveloperTeamButton />
          </div>
        </header>

        <main className="hero">
          <div className="hero__inner">
            <h1 className="hero__title">
              <span className="hero__title-line">
                <img
                  src={hermesLogo}
                  alt="Hermes"
                  className="hero__title-logo"
                />
                <span className="hero__title-gradient"> </span>
              </span>
            </h1>

            <p className="hero__subtitle">
              The swift messenger of the gods, Hermes, transforms hurricane
              uncertainty into a synchronized, autonomous lifeline to save
              lives.
            </p>

            <ButtonSimulate />
          </div>
        </main>
      </div>
    </div>
  )
}
