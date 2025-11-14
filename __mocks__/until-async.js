/**
 * Manual mock for until-async (ESM-only package)
 * Provides the same API that MSW expects
 */
module.exports = {
  until: async (promise) => {
    try {
      const result = await promise;
      return [null, result];
    } catch (error) {
      return [error, null];
    }
  },
};




