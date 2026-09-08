import { describe, it, expect, beforeEach } from 'vitest'
import { useGmCredentialsStore } from './useGmCredentialsStore'

describe('useGmCredentialsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useGmCredentialsStore.setState({ credentials: {}, activeMapId: null })
  })

  describe('initial state', () => {
    it('starts with empty credentials and null activeMapId', () => {
      const state = useGmCredentialsStore.getState()
      expect(state.credentials).toEqual({})
      expect(state.activeMapId).toBeNull()
    })
  })

  describe('saveCredential', () => {
    it('saves the secret mapped to mapId and sets activeMapId', () => {
      useGmCredentialsStore.getState().saveCredential('map-1', 'secret-abc')

      const state = useGmCredentialsStore.getState()
      expect(state.credentials['map-1']).toBe('secret-abc')
      expect(state.activeMapId).toBe('map-1')
    })

    it('allows multiple credentials for different maps', () => {
      useGmCredentialsStore.getState().saveCredential('map-1', 'secret-1')
      useGmCredentialsStore.getState().saveCredential('map-2', 'secret-2')

      const state = useGmCredentialsStore.getState()
      expect(state.credentials['map-1']).toBe('secret-1')
      expect(state.credentials['map-2']).toBe('secret-2')
      expect(state.activeMapId).toBe('map-2')
    })
  })

  describe('getCredential', () => {
    it('returns the secret for an existing mapId', () => {
      useGmCredentialsStore.getState().saveCredential('map-1', 'secret-1')
      expect(useGmCredentialsStore.getState().getCredential('map-1')).toBe('secret-1')
    })

    it('returns undefined for non-existent mapId', () => {
      expect(useGmCredentialsStore.getState().getCredential('unknown')).toBeUndefined()
    })
  })

  describe('clearCredential', () => {
    it('removes the credential for the given mapId', () => {
      useGmCredentialsStore.getState().saveCredential('map-1', 'secret-1')
      useGmCredentialsStore.getState().clearCredential('map-1')

      expect(useGmCredentialsStore.getState().getCredential('map-1')).toBeUndefined()
      expect(useGmCredentialsStore.getState().credentials['map-1']).toBeUndefined()
    })

    it('resets activeMapId to null when clearing the currently active map', () => {
      useGmCredentialsStore.getState().saveCredential('map-1', 'secret-1')
      expect(useGmCredentialsStore.getState().activeMapId).toBe('map-1')

      useGmCredentialsStore.getState().clearCredential('map-1')
      expect(useGmCredentialsStore.getState().activeMapId).toBeNull()
    })

    it('preserves activeMapId when clearing a different map', () => {
      useGmCredentialsStore.getState().saveCredential('map-1', 'secret-1')
      useGmCredentialsStore.getState().saveCredential('map-2', 'secret-2')
      expect(useGmCredentialsStore.getState().activeMapId).toBe('map-2')

      useGmCredentialsStore.getState().clearCredential('map-1')
      expect(useGmCredentialsStore.getState().activeMapId).toBe('map-2')
      expect(useGmCredentialsStore.getState().getCredential('map-1')).toBeUndefined()
      expect(useGmCredentialsStore.getState().getCredential('map-2')).toBe('secret-2')
    })
  })

  describe('setActiveMapId', () => {
    it('updates activeMapId to string or null', () => {
      useGmCredentialsStore.getState().setActiveMapId('map-99')
      expect(useGmCredentialsStore.getState().activeMapId).toBe('map-99')

      useGmCredentialsStore.getState().setActiveMapId(null)
      expect(useGmCredentialsStore.getState().activeMapId).toBeNull()
    })
  })
})
