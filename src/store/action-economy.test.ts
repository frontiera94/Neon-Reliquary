import { describe, it, expect, beforeEach } from 'vitest'
import { useSessionStore, defaultActionEconomy } from './useSessionStore'

describe('Action Economy in useSessionStore', () => {
  beforeEach(() => {
    useSessionStore.setState({ sessions: {} })
  })

  it('initializes default action economy', () => {
    const { initSession, getSession } = useSessionStore.getState()
    initSession('char1', 50)
    const sess = getSession('char1')
    expect(sess.actionEconomy).toEqual(defaultActionEconomy())
    expect(sess.actionEconomy?.standard).toBe(false)
    expect(sess.actionEconomy?.move).toBe(false)
    expect(sess.actionEconomy?.fullRound).toBe(false)
  })

  it('toggles standard action and move action independently', () => {
    const { initSession, toggleRoundAction, getSession } = useSessionStore.getState()
    initSession('char1', 50)

    toggleRoundAction('char1', 'standard')
    let sess = getSession('char1')
    expect(sess.actionEconomy?.standard).toBe(true)
    expect(sess.actionEconomy?.move).toBe(false)
    expect(sess.actionEconomy?.fullRound).toBe(false)

    toggleRoundAction('char1', 'move')
    sess = getSession('char1')
    expect(sess.actionEconomy?.standard).toBe(true)
    expect(sess.actionEconomy?.move).toBe(true)
    expect(sess.actionEconomy?.fullRound).toBe(true)

    toggleRoundAction('char1', 'standard')
    sess = getSession('char1')
    expect(sess.actionEconomy?.standard).toBe(false)
    expect(sess.actionEconomy?.move).toBe(true)
    expect(sess.actionEconomy?.fullRound).toBe(false)
  })

  it('toggling fullRound consumes standard and move actions, and untoggling frees both', () => {
    const { initSession, toggleRoundAction, getSession } = useSessionStore.getState()
    initSession('char1', 50)

    toggleRoundAction('char1', 'fullRound')
    let sess = getSession('char1')
    expect(sess.actionEconomy?.fullRound).toBe(true)
    expect(sess.actionEconomy?.standard).toBe(true)
    expect(sess.actionEconomy?.move).toBe(true)

    toggleRoundAction('char1', 'fullRound')
    sess = getSession('char1')
    expect(sess.actionEconomy?.fullRound).toBe(false)
    expect(sess.actionEconomy?.standard).toBe(false)
    expect(sess.actionEconomy?.move).toBe(false)
  })

  it('resets all round actions on resetRoundActions and longRest', () => {
    const { initSession, toggleRoundAction, resetRoundActions, longRest, getSession } =
      useSessionStore.getState()
    initSession('char1', 50)

    toggleRoundAction('char1', 'swift')
    toggleRoundAction('char1', 'fullRound')
    expect(getSession('char1').actionEconomy?.swift).toBe(true)

    resetRoundActions('char1')
    expect(getSession('char1').actionEconomy).toEqual(defaultActionEconomy())

    toggleRoundAction('char1', 'immediate')
    longRest('char1', 50)
    expect(getSession('char1').actionEconomy).toEqual(defaultActionEconomy())
  })

  it('manages currentRound correctly across turns and combat reset', () => {
    const { initSession, nextRound, resetRoundActions, resetCombatRound, setCombatRound, longRest, getSession } =
      useSessionStore.getState()
    initSession('char1', 50)

    // Initial round is 1
    expect(getSession('char1').currentRound).toBe(1)

    // resetRoundActions increments round
    resetRoundActions('char1')
    expect(getSession('char1').currentRound).toBe(2)

    // nextRound increments round
    nextRound('char1')
    expect(getSession('char1').currentRound).toBe(3)

    // setCombatRound overrides round
    setCombatRound('char1', 5)
    expect(getSession('char1').currentRound).toBe(5)

    // resetCombatRound resets back to round 1
    resetCombatRound('char1')
    expect(getSession('char1').currentRound).toBe(1)

    // longRest resets back to round 1
    nextRound('char1')
    expect(getSession('char1').currentRound).toBe(2)
    longRest('char1', 50)
    expect(getSession('char1').currentRound).toBe(1)
  })
})
