// expo-notifications agrega el permiso de notificaciones push (aps-environment).
// La app solo usa notificaciones locales, que no lo necesitan, y los equipos personales
// (Apple ID gratis) no pueden firmar apps con ese permiso. Este plugin lo quita.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withNoPushEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
