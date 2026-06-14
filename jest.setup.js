import '@testing-library/jest-dom';

// Increase default timeout for slow sandbox environments
jest.setTimeout(45000);

// --- Web API Polyfills for Node.js / JSDOM Environment ---
// Required for Prisma 7 + PostgreSQL Driver Adapter (pg) in tests
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// --- Industrial Environment Isolation ---
// Standard tests always run in SaaS mode to ensure isolation from local .env.local settings.
// To explicitly test Desktop functionality, use: cross-env KOREKI_TEST_PLATFORM=desktop npm test
if (process.env.KOREKI_TEST_PLATFORM !== 'desktop' && process.env.NEXT_PUBLIC_KOREKI_DESKTOP === 'true') {
    process.env.NEXT_PUBLIC_KOREKI_DESKTOP = 'false';
}


// Global mock for Next.js Navigation (App Router & Pages Router)
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/',
    query: {},
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
}));

// Mock for Next.js Fonts
jest.mock('next/font/google', () => ({
  Inter: () => ({ className: 'inter' }),
  Roboto: () => ({ className: 'roboto' }),
  Outfit: () => ({ className: 'outfit' }),
}));

// Global mock for fetch (API Infrastructure)
global.fetch = jest.fn().mockImplementation((url) => {
  if (url === '/api/user') {
    return Promise.resolve({
      ok: true,
      json: async () => ({ loggedIn: true, user: { id: 'user-123', username: 'testuser', role: 'USER', credits: 20 } }),
    });
  }
  return Promise.resolve({
    ok: true,
    json: async () => ([]),
  });
});

// useAuth mock removed from global scope to preserve unit test integrity. 
// It must be mocked locally in integration tests. 🏮🛡️

// Mock for TanStack Query (Data Fetching Layer)
jest.mock('@tanstack/react-query', () => {
    const React = require('react');
    const mockQueryClient = {
        mount: jest.fn(),
        unmount: jest.fn(),
        isFetching: jest.fn(),
        isMutating: jest.fn(),
        getQueryData: jest.fn(),
        setQueryData: jest.fn(),
        clear: jest.fn(),
        getQueryCache: jest.fn(() => ({
            clear: jest.fn(),
        })),
        invalidateQueries: jest.fn(),
        removeQueries: jest.fn(),
    };

    return {
        useQuery: jest.fn().mockReturnValue({
            data: { id: 'user-123', username: 'testuser', role: 'USER', credits: 20 },
            isLoading: false,
            error: null,
            refetch: jest.fn(),
        }),
        useMutation: jest.fn().mockReturnValue({
            mutate: jest.fn(),
            isLoading: false,
        }),
        useQueryClient: jest.fn(() => mockQueryClient),
        QueryClient: jest.fn(() => mockQueryClient),
        QueryClientProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    };
});

// Mock for pdfjs-dist (ESM/Worker Layer)
jest.mock('pdfjs-dist', () => ({
    GlobalWorkerOptions: {
        workerSrc: '',
    },
    getDocument: jest.fn(() => ({
        promise: Promise.resolve({
            numPages: 1,
            getPage: jest.fn(() => ({
                getTextContent: jest.fn(() => ({
                    items: [{ str: 'Mocked Content', transform: [0,0,0,0,0,0] }],
                })),
                getViewport: jest.fn(() => ({ width: 100, height: 100 })),
                render: jest.fn(() => ({ promise: Promise.resolve() })),
            })),
        }),
    })),
}));

// Mock for binary/ESM libraries that cause SyntaxErrors in Jest
jest.mock('jspdf', () => {
    const mock = jest.fn().mockImplementation(() => ({
        addFileToVFS: jest.fn(),
        addFont: jest.fn(),
        setFont: jest.fn(),
        text: jest.fn(),
        save: jest.fn(),
        output: jest.fn(),
        internal: { 
            pageSize: { getWidth: () => 210, getHeight: () => 297 },
            getNumberOfPages: jest.fn(() => 1)
        },
        setFontSize: jest.fn(),
        splitTextToSize: jest.fn(() => ['split line']),
        setTextColor: jest.fn(),
        setDrawColor: jest.fn(),
        setLineWidth: jest.fn(),
        line: jest.fn(),
        setPage: jest.fn(),
        setLineDashPattern: jest.fn(),
        rect: jest.fn(),
        getTextWidth: jest.fn().mockReturnValue(10),
        addImage: jest.fn(),
        addPage: jest.fn(),
    }));
    return {
        __esModule: true,
        default: mock,
        jsPDF: mock
    };
});

jest.mock('jspdf-autotable', () => jest.fn());

jest.mock('jszip', () => {
    return jest.fn().mockImplementation(() => ({
        file: jest.fn(),
        generateAsync: jest.fn().mockResolvedValue(new Blob())
    }));
});

jest.mock('xlsx', () => ({
    utils: {
        book_new: jest.fn(() => ({})),
        json_to_sheet: jest.fn(() => ({})),
        book_append_sheet: jest.fn(),
    },
    write: jest.fn(() => new ArrayBuffer(0)),
    writeFile: jest.fn(),
}));

// --- ESM/Markdown Mocking 🧠 ---
// These libraries are pure ESM and cause SyntaxErrors in Jest.
// Mocking them globally ensures environmental stability across all tests.
jest.mock('react-markdown', () => {
    return function MockMarkdown({ children }) {
        return <div data-testid="mock-markdown">{children}</div>;
    };
});

jest.mock('remark-math', () => jest.fn());
jest.mock('remark-gfm', () => jest.fn());
jest.mock('rehype-katex', () => jest.fn());
jest.mock('rehype-raw', () => jest.fn());
