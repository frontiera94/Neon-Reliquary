import { TacticalHUD } from './TacticalHUD'

/**
 * TopBar component wraps TacticalHUD to provide full persistent tactical HUD features
 * while maintaining 100% backward compatibility with existing layouts and test suites.
 */
export function TopBar() {
  return <TacticalHUD />
}
