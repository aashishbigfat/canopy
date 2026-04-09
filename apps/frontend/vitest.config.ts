export default {
  test: {
    environment: 'node',
    globals: true,
    include: ['src/__tests__/**/*.test.ts'],
    testTimeout: 30000,
  },
}

