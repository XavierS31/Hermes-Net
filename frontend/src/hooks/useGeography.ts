import { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export interface GeographyData {
  shelter_points: { id: string; lng: number; lat: number; name: string }[]
  bridge_points: { id: string; lng: number; lat: number; name: string }[]
}

export function useGeography() {
  const [data, setData] = useState<GeographyData | null>(null)
  useEffect(() => {
    fetch(`${API}/geography`)
      .then((r) => r.json())
      .then((j) =>
        setData({
          shelter_points: j.shelter_points ?? [],
          bridge_points: j.bridge_points ?? [],
        }),
      )
      .catch(() => setData(null))
  }, [])
  return data
}
