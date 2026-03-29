import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MapView from './components/Map/MapView'
import StatusBar from './components/UI/StatusBar'
import SimControls from './components/UI/SimControls'
import LeftPanel from './components/Sidebar/LeftPanel'
import RightPanel from './components/Sidebar/RightPanel'
import { useSimStore } from './store/simulationStore'
import styles from './App.module.css'

export default function App() {
  const status = useSimStore(s => s.status)

  return (
    <div className={styles.app}>
      <StatusBar />

      <div className={styles.main}>
        <AnimatePresence>
          <motion.div
            className={styles.leftPanel}
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <LeftPanel />
          </motion.div>
        </AnimatePresence>

        <div className={styles.mapContainer}>
          <MapView />
          <SimControls />
        </div>

        <AnimatePresence>
          <motion.div
            className={styles.rightPanel}
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          >
            <RightPanel />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Scan line overlay for atmosphere */}
      <div className={styles.scanlines} />
    </div>
  )
}