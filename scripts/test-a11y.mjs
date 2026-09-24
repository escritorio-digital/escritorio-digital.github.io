// Prueba de accesibilidad: pasa axe-core (WCAG 2.1 A y AA) por el escritorio, el menú
// Inicio, las ventanas de ayuda, cada widget recién abierto y algunos widgets con datos.
// Uso: npm run test:a11y  (termina con error si encuentra algún fallo)
//
// Levanta el servidor de desarrollo de Vite en un puerto libre, así que prueba el código
// actual sin compilar. La lista de widgets sale de src/components/widgets/*/widgetConfig.tsx:
// un widget nuevo entra solo en la prueba. Solo detecta lo que axe puede juzgar
// (alrededor de un tercio de los problemas); el teclado y el lector de pantalla se
// revisan a mano. En un equipo nuevo, antes: npx playwright install chromium

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { createRequire } from 'node:module';

const ROOT = new URL('..', import.meta.url).pathname;
const AXE_SOURCE = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const WIDGETS_DIR = join(ROOT, 'src/components/widgets');
const es = JSON.parse(readFileSync(join(ROOT, 'public/locales/es/translation.json'), 'utf8'));
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const CONCURRENCY = 4;

// Textos de la interfaz que usa la prueba para moverse por ella.
const START = es.toolbar.start;
const HELP = es.start_menu.help;
const SEARCH = es.settings.widgets.search;

const translate = (key) => key.split('.').reduce((node, part) => node?.[part], es);

const widgets = readdirSync(WIDGETS_DIR)
    .map((folder) => join(WIDGETS_DIR, folder, 'widgetConfig.tsx'))
    .filter(existsSync)
    .map((file) => {
        const source = readFileSync(file, 'utf8');
        const id = source.match(/id:\s*'([^']+)'/)?.[1];
        const titleKey = source.match(/title:\s*'([^']+)'/)?.[1];
        const title = titleKey && (translate(titleKey) ?? titleKey);
        return id && typeof title === 'string' ? { id, title } : null;
    })
    .filter(Boolean);

// Pulsa con JavaScript: las ventanas se colocan al azar y pueden quedar bajo la barra.
const press = (locator) => locator.evaluate((element) => element.click());

const openStart = async (page) => {
    await page.locator(`button[aria-label="${START}"]`).first().click();
};

const openWidget = async (page, title) => {
    await openStart(page);
    const search = page.getByPlaceholder(SEARCH);
    await search.fill(title);
    await search.press('Enter');
    await page.waitForTimeout(1200);
};

const openHelpItem = (label) => async (page) => {
    await openStart(page);
    await page.locator(`button[aria-label="${HELP}"]`).first().click();
    await press(page.getByText(label, { exact: true }).last());
    await page.waitForTimeout(500);
};

const addItems = (placeholder, items) => async (page) => {
    for (const item of items) {
        const input = page.getByPlaceholder(placeholder);
        await input.fill(item);
        await input.press('Enter');
    }
};

const attendance = es.widgets.attendance;

// Cada caso abre un estado y devuelve, si hace falta, estados adicionales que auditar.
const cases = [
    { name: 'escritorio', open: async () => {} },
    {
        name: 'escritorio sobre fondo blanco',
        open: (page) => page.evaluate(() => {
            document.body.style.backgroundImage = 'none';
            document.body.style.backgroundColor = '#ffffff';
        }),
    },
    { name: 'menú Inicio', open: openStart },
    { name: es.about.title, open: openHelpItem(es.help.about) },
    { name: es.licenses.title, open: openHelpItem(es.help.licenses) },
    ...widgets.map(({ id, title }) => ({ name: `widget ${id}`, open: (page) => openWidget(page, title) })),
    {
        name: 'Asistencia con estudiantes (tres pestañas)',
        open: async (page) => {
            await openWidget(page, attendance.title);
            await addItems(attendance.new_student_placeholder, ['Ana', 'Luis'])(page);
        },
        extraStates: [attendance.badges_tab, attendance.alerts_tab].map((tab) => async (page) => {
            await press(page.getByText(tab, { exact: true }).first());
            await page.waitForTimeout(300);
        }),
    },
    {
        name: 'Asistencia: diálogo de guardado',
        open: async (page) => {
            await openWidget(page, attendance.title);
            await addItems(attendance.new_student_placeholder, ['Ana'])(page);
            await press(page.getByTitle(attendance.export_without_names_tooltip));
            await page.waitForTimeout(500);
        },
    },
    {
        name: 'Marcador con equipos',
        open: async (page) => {
            await openWidget(page, es.widgets.scoreboard.title);
            await addItems(es.widgets.scoreboard.input_placeholder, ['Rojo', 'Azul'])(page);
        },
    },
    {
        name: 'Lista de trabajo con tareas',
        open: async (page) => {
            await openWidget(page, es.widgets.work_list.title);
            await addItems(es.widgets.work_list.add_task_placeholder, ['Leer', 'Resumir'])(page);
        },
    },
    {
        name: 'Generador de grupos con grupos',
        open: async (page) => {
            await openWidget(page, es.widgets.group_generator.title);
            await page.getByPlaceholder(es.widgets.group_generator.placeholder).fill('Ana\nLuis\nEva\nPau\nIsa\nJon');
            await press(page.getByText(es.widgets.group_generator.generate_groups, { exact: true }));
        },
    },
    {
        name: 'Cronómetro en marcha con una vuelta',
        open: async (page) => {
            await openWidget(page, es.widgets.stopwatch.title);
            await press(page.locator('.start-stop'));
            await page.waitForTimeout(400);
            await press(page.locator('.lap'));
        },
    },
];

// axe se inyecta solo en la página del escritorio: el contenido de los iframes, que viene
// de otros sitios, es de esos proyectos y no se analiza (el iframe en sí, sí).
const audit = async (page) => {
    if (!(await page.evaluate(() => 'axe' in window))) {
        await page.addScriptTag({ content: AXE_SOURCE });
    }
    return page.evaluate(
        async (tags) => (await window.axe.run(document, { runOnly: { type: 'tag', values: tags } })).violations,
        TAGS,
    );
};

const runCase = async (browser, url, testCase) => {
    const context = await browser.newContext({ locale: 'es-ES', viewport: { width: 1366, height: 800 } });
    const page = await context.newPage();
    page.on('popup', (popup) => popup.close().catch(() => {}));
    try {
        await page.goto(url);
        await page.waitForTimeout(1200);
        await testCase.open(page);
        await page.waitForTimeout(600);
        const violations = await audit(page);
        for (const extra of testCase.extraStates ?? []) {
            await extra(page);
            violations.push(...(await audit(page)));
        }
        return { name: testCase.name, violations };
    } catch (error) {
        return { name: testCase.name, error: error.message.split('\n')[0] };
    } finally {
        await context.close();
    }
};

const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5300, strictPort: false } });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch();

console.log(`Accesibilidad (axe, WCAG 2.1 AA): ${cases.length} casos en ${url}\n`);
const results = [];
for (let i = 0; i < cases.length; i += CONCURRENCY) {
    const batch = await Promise.all(cases.slice(i, i + CONCURRENCY).map((testCase) => runCase(browser, url, testCase)));
    for (const result of batch) {
        results.push(result);
        if (result.error) {
            console.log(`✗ ${result.name}: no se pudo abrir (${result.error})`);
        } else if (result.violations.length) {
            console.log(`✗ ${result.name}`);
            for (const violation of result.violations) {
                console.log(`    ${violation.id} (${violation.nodes.length}): ${violation.help}`);
                for (const node of violation.nodes.slice(0, 3)) {
                    console.log(`      ${node.target.join(' ')}`);
                }
            }
        } else {
            console.log(`✓ ${result.name}`);
        }
    }
}

await browser.close();
await server.close();

const failed = results.filter((result) => result.error || result.violations.length);
console.log(`\n${results.length - failed.length} de ${results.length} casos sin fallos.`);
process.exit(failed.length ? 1 : 0);
