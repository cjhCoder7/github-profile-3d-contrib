import * as aggregate from '../src/aggregate-user-info'
import * as client from '../src/github-graphql';
import * as type from '../src/type';
import { dummyData } from './dummy-data';

describe('github-graphql', () => {
    it('fetchData', () => {
        const userInfo = aggregate.aggregateUserInfo(dummyData);

        expect(userInfo.contributionCalendar.length).toEqual(371);

        const languages: Array<type.LangInfo> = [
            {
                "language": "Jupyter Notebook",
                "color": "#DA5B0B",
                "contributions": 108
            },
            {
                "language": "Perl",
                "color": "#0298c3",
                "contributions": 73
            },
            {
                "language": "Kotlin",
                "color": "#F18E33",
                "contributions": 58
            },
            {
                "language": "TypeScript",
                "color": "#2b7489",
                "contributions": 31
            },
            {
                "language": "Java",
                "color": "#b07219",
                "contributions": 28
            },
            {
                "language": "Go",
                "color": "#00ADD8",
                "contributions": 20
            },
            {
                "language": "Python",
                "color": "#3572A5",
                "contributions": 10
            },
            {
                "language": "JavaScript",
                "color": "#f1e05a",
                "contributions": 7
            },
            {
                "language": "C",
                "color": "#555555",
                "contributions": 4
            },
            {
                "language": "Ruby",
                "color": "#701516",
                "contributions": 1
            }
        ];
        expect(userInfo.contributesLanguage).toEqual(languages);

        expect(userInfo.totalContributions).toEqual(366);
        expect(userInfo.totalCommitContributions).toEqual(344);
        expect(userInfo.totalIssueContributions).toEqual(4);
        expect(userInfo.totalPullRequestContributions).toEqual(12);
        expect(userInfo.totalPullRequestReviewContributions).toEqual(0);
        expect(userInfo.totalRepositoryContributions).toEqual(6);
        expect(userInfo.totalForkCount).toEqual(0);
        expect(userInfo.totalStargazerCount).toEqual(6);
    });
});

describe('excludeLanguages', () => {
    const makeResponse = (
        repos: client.CommitContributionsByRepository,
    ): client.ResponseType => ({
        data: {
            user: {
                contributionsCollection: {
                    contributionCalendar: {
                        isHalloween: false,
                        totalContributions: 0,
                        weeks: [],
                    },
                    commitContributionsByRepository: repos,
                    totalCommitContributions: 100,
                    totalIssueContributions: 0,
                    totalPullRequestContributions: 0,
                    totalPullRequestReviewContributions: 0,
                    totalRepositoryContributions: 0,
                },
                repositories: { edges: [], nodes: [] },
            },
        },
    });

    const twoLangResponse = makeResponse([
        {
            repository: {
                primaryLanguage: { name: 'TypeScript', color: '#2b7489' },
                languages: {
                    edges: [
                        { size: 7000, node: { name: 'TypeScript', color: '#2b7489' } },
                        { size: 3000, node: { name: 'JavaScript', color: '#f1e05a' } },
                    ],
                },
            },
            contributions: { totalCount: 100 },
        },
    ]);

    it('excludes specified languages', () => {
        const userInfo = aggregate.aggregateUserInfo(twoLangResponse, 'breakdown', ['TypeScript']);

        expect(userInfo.contributesLanguage.length).toBe(1);
        expect(userInfo.contributesLanguage[0].language).toBe('JavaScript');
    });

    it('excludes languages case-insensitively', () => {
        const userInfo = aggregate.aggregateUserInfo(twoLangResponse, 'breakdown', ['typescript']);

        expect(userInfo.contributesLanguage.length).toBe(1);
        expect(userInfo.contributesLanguage[0].language).toBe('JavaScript');
    });

    it('does not exclude anything when array is empty', () => {
        const userInfo = aggregate.aggregateUserInfo(twoLangResponse, 'breakdown', []);

        expect(userInfo.contributesLanguage.length).toBe(2);
    });
});

describe('breakdown mode', () => {
    const makeResponse = (
        repos: client.CommitContributionsByRepository,
    ): client.ResponseType => ({
        data: {
            user: {
                contributionsCollection: {
                    contributionCalendar: {
                        isHalloween: false,
                        totalContributions: 0,
                        weeks: [],
                    },
                    commitContributionsByRepository: repos,
                    totalCommitContributions: 100,
                    totalIssueContributions: 0,
                    totalPullRequestContributions: 0,
                    totalPullRequestReviewContributions: 0,
                    totalRepositoryContributions: 0,
                },
                repositories: { edges: [], nodes: [] },
            },
        },
    });

    it('splits contributions proportionally across languages', () => {
        const response = makeResponse([
            {
                repository: {
                    primaryLanguage: { name: 'TypeScript', color: '#2b7489' },
                    languages: {
                        edges: [
                            { size: 7000, node: { name: 'TypeScript', color: '#2b7489' } },
                            { size: 3000, node: { name: 'JavaScript', color: '#f1e05a' } },
                        ],
                    },
                },
                contributions: { totalCount: 100 },
            },
        ]);
        const userInfo = aggregate.aggregateUserInfo(response, 'breakdown');

        expect(userInfo.contributesLanguage.length).toBe(2);
        const ts = userInfo.contributesLanguage.find((l) => l.language === 'TypeScript');
        const js = userInfo.contributesLanguage.find((l) => l.language === 'JavaScript');
        expect(ts!.contributions).toBeCloseTo(70);
        expect(js!.contributions).toBeCloseTo(30);
    });

    it('falls back to primaryLanguage when languages is null', () => {
        const response = makeResponse([
            {
                repository: {
                    primaryLanguage: { name: 'Go', color: '#00ADD8' },
                    languages: null,
                },
                contributions: { totalCount: 50 },
            },
        ]);
        const userInfo = aggregate.aggregateUserInfo(response, 'breakdown');

        expect(userInfo.contributesLanguage.length).toBe(1);
        expect(userInfo.contributesLanguage[0].language).toBe('Go');
        expect(userInfo.contributesLanguage[0].contributions).toBe(50);
    });

    it('falls back to primaryLanguage when languages edges is empty', () => {
        const response = makeResponse([
            {
                repository: {
                    primaryLanguage: { name: 'Rust', color: '#dea584' },
                    languages: { edges: [] },
                },
                contributions: { totalCount: 25 },
            },
        ]);
        const userInfo = aggregate.aggregateUserInfo(response, 'breakdown');

        expect(userInfo.contributesLanguage.length).toBe(1);
        expect(userInfo.contributesLanguage[0].language).toBe('Rust');
        expect(userInfo.contributesLanguage[0].contributions).toBe(25);
    });

    it('skips repos with no primaryLanguage and no languages', () => {
        const response = makeResponse([
            {
                repository: {
                    primaryLanguage: null,
                    languages: null,
                },
                contributions: { totalCount: 10 },
            },
        ]);
        const userInfo = aggregate.aggregateUserInfo(response, 'breakdown');

        expect(userInfo.contributesLanguage.length).toBe(0);
    });

    it('aggregates same language across multiple repos', () => {
        const response = makeResponse([
            {
                repository: {
                    primaryLanguage: { name: 'Python', color: '#3572A5' },
                    languages: {
                        edges: [
                            { size: 8000, node: { name: 'Python', color: '#3572A5' } },
                            { size: 2000, node: { name: 'C', color: '#555555' } },
                        ],
                    },
                },
                contributions: { totalCount: 100 },
            },
            {
                repository: {
                    primaryLanguage: { name: 'Python', color: '#3572A5' },
                    languages: {
                        edges: [
                            { size: 5000, node: { name: 'Python', color: '#3572A5' } },
                            { size: 5000, node: { name: 'C', color: '#555555' } },
                        ],
                    },
                },
                contributions: { totalCount: 50 },
            },
        ]);
        const userInfo = aggregate.aggregateUserInfo(response, 'breakdown');

        const py = userInfo.contributesLanguage.find((l) => l.language === 'Python');
        const c = userInfo.contributesLanguage.find((l) => l.language === 'C');
        // Repo1: Python 80, C 20. Repo2: Python 25, C 25. Total: Python 105, C 45
        expect(py!.contributions).toBeCloseTo(105);
        expect(c!.contributions).toBeCloseTo(45);
    });

    it('uses primary mode by default (ignores languages field)', () => {
        const response = makeResponse([
            {
                repository: {
                    primaryLanguage: { name: 'TypeScript', color: '#2b7489' },
                    languages: {
                        edges: [
                            { size: 7000, node: { name: 'TypeScript', color: '#2b7489' } },
                            { size: 3000, node: { name: 'JavaScript', color: '#f1e05a' } },
                        ],
                    },
                },
                contributions: { totalCount: 100 },
            },
        ]);
        const userInfo = aggregate.aggregateUserInfo(response);

        expect(userInfo.contributesLanguage.length).toBe(1);
        expect(userInfo.contributesLanguage[0].language).toBe('TypeScript');
        expect(userInfo.contributesLanguage[0].contributions).toBe(100);
    });
});
