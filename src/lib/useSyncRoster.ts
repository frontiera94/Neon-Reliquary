import { useEffect } from 'react'
import { useCharacterStore, type FullCharacter } from '../store/useCharacterStore'
import mazeData from '../data/mazikeen-noctis.json'
import shotrixData from '../data/shotrix-blackburn.json'
import knamData from '../data/knam.json'
import agelmundData from '../data/agelmund.json'
import marianoData from '../data/mariano-cardamomo.json'
import noorieData from '../data/noorie.json'

export function useSyncRoster() {
  const loadCharacter = useCharacterStore((s) => s.loadCharacter)
  const removeCharacter = useCharacterStore((s) => s.removeCharacter)

  useEffect(() => {
    removeCharacter('valerius')
    removeCharacter('kaelen')
    loadCharacter(mazeData as unknown as FullCharacter)
    loadCharacter(shotrixData as unknown as FullCharacter)
    loadCharacter(knamData as unknown as FullCharacter)
    loadCharacter(agelmundData as unknown as FullCharacter)
    loadCharacter(marianoData as unknown as FullCharacter)
    loadCharacter(noorieData as unknown as FullCharacter)
  }, [loadCharacter, removeCharacter])
}
