import * as d3 from 'd3';
import * as type from './type';

const OTHER_NAME = 'other';
const OTHER_COLOR = '#444444';

export const createPieLanguage = (
    svg: d3.Selection<SVGSVGElement, unknown, null, unknown>,
    userInfo: type.UserInfo,
    x: number,
    y: number,
    width: number,
    height: number,
    settings: type.PieLangSettings,
    isForcedAnimation: boolean,
    topLanguages: number = 5,
): void => {
    if (userInfo.totalContributions === 0) {
        return;
    }

    const languages = userInfo.contributesLanguage.slice(0, topLanguages);
    const sumContrib = languages
        .map((lang) => lang.contributions)
        .reduce((a, b) => a + b, 0);
    const allLangContrib = userInfo.contributesLanguage
        .map((lang) => lang.contributions)
        .reduce((a, b) => a + b, 0);
    const otherContributions = allLangContrib - sumContrib;
    if (0 < otherContributions) {
        languages.push({
            language: OTHER_NAME,
            color: OTHER_COLOR,
            contributions: otherContributions,
        });
    }

    const isAnimate = settings.growingAnimation || isForcedAnimation;
    const animeSteps = 5;
    const animateOpacity = (num: number) =>
        Array<string>(languages.length + animeSteps)
            .fill('')
            .map((d, i) => (i < num ? 0 : Math.min((i - num) / animeSteps, 1)))
            .join(';');

    const radius = height / 2;
    const margin = radius / 10;

    const row = 8;
    const fontSize = height / row / 1.5;
    const useColumns = languages.length > 5;
    const columnCount = useColumns ? 5 : languages.length;
    const offset = (row - columnCount) / 2 + 0.5;
    const columnWidth = useColumns
        ? (width - radius * 2.1) / 2
        : 0;

    const pie = d3
        .pie<type.LangInfo>()
        .value((d) => d.contributions)
        .sortValues(null);
    const pieData = pie(languages);

    const group = svg.append('g').attr('transform', `translate(${x}, ${y})`);

    const groupLabel = group
        .append('g')
        .attr('transform', `translate(${radius * 2.1}, ${0})`);

    const markerX = (index: number) =>
        useColumns ? Math.floor(index / 5) * columnWidth : 0;
    const labelX = (index: number) =>
        markerX(index) + fontSize * 1.2;
    const itemY = (index: number) =>
        ((useColumns ? index % 5 : index) + offset) * (height / row);

    // markers for label
    const markers = groupLabel
        .selectAll(null)
        .data(pieData)
        .enter()
        .append('rect')
        .attr('x', (d) => markerX(d.index))
        .attr('y', (d) => itemY(d.index) - fontSize / 2)
        .attr('width', fontSize)
        .attr('height', fontSize)
        .attr('fill', (d) => d.data.color)
        .attr('class', 'stroke-bg')
        .attr('stroke-width', '1px');
    if (isAnimate) {
        markers
            .append('animate')
            .attr('attributeName', 'fill-opacity')
            .attr('values', (d, i) => animateOpacity(i))
            .attr('dur', '3s')
            .attr('repeatCount', '1');
    }

    // labels
    const labels = groupLabel
        .selectAll(null)
        .data(pieData)
        .enter()
        .append('text')
        .attr('dominant-baseline', 'middle')
        .text((d) => d.data.language)
        .attr('x', (d) => labelX(d.index))
        .attr('y', (d) => itemY(d.index))
        .attr('class', 'fill-fg')
        .attr('font-size', `${fontSize}px`);
    if (isAnimate) {
        labels
            .append('animate')
            .attr('attributeName', 'fill-opacity')
            .attr('values', (d, i) => animateOpacity(i))
            .attr('dur', '3s')
            .attr('repeatCount', '1');
    }

    const arc = d3
        .arc<d3.PieArcDatum<type.LangInfo>>()
        .outerRadius(radius - margin)
        .innerRadius(radius / 2);

    // pie chart
    const paths = group
        .append('g')
        .attr('transform', `translate(${radius}, ${radius})`)
        .selectAll(null)
        .data(pieData)
        .enter()
        .append('path')
        .attr('d', arc)
        .style('fill', (d) => d.data.color) // style -> attr ?
        .attr('class', 'stroke-bg')
        .attr('stroke-width', '2px');
    paths
        .append('title')
        .text((d) => `${d.data.language} ${Math.round(d.data.contributions)}`);
    if (isAnimate) {
        paths
            .append('animate')
            .attr('attributeName', 'fill-opacity')
            .attr('values', (d, i) => animateOpacity(i))
            .attr('dur', '3s')
            .attr('repeatCount', '1');
    }
};
