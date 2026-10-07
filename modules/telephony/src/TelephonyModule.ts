import { NativeModule, requireNativeModule } from 'expo';

import type { CellularInfo } from './Telephony.types';

declare class TelephonyModule extends NativeModule<{}> {
  getCellularInfo(): CellularInfo;
}

export default requireNativeModule<TelephonyModule>('Telephony');
