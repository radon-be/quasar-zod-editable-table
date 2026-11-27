import assert from 'node:assert/strict'
import test from 'node:test'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { Quasar } from 'quasar'
import { z } from 'zod'
import { ZodTable } from '../dist/components.js'
import register from '../dist/boot/register.js'

const schema = z.object({ id: z.number(), name: z.string(), role: z.enum(['admin', 'user']) })
const row = { id: 1, name: 'Alice', role: 'admin' }

async function render(props = {}, slots = {}) {
  const app = createSSRApp({
    render: () => h(ZodTable, { rowKey: 'id', rowModel: schema, data: [row], ...props }, slots),
  })
  app.use(Quasar, {}, { req: { headers: { 'user-agent': 'node' } } })
  return renderToString(app)
}

test('compiled package and app extension boot load in Node', () => {
  assert.equal(typeof register, 'function')
  assert.ok(ZodTable)
})

test('column options preserve inferred editing and allow disabling sorting', async () => {
  const html = await render({
    editable: true,
    editableColumns: ['*'],
    extraColumnOptions: { name: { sortable: false }, role: { noVerticalPadding: true } },
  })
  assert.match(html, /class="text-left\s+sortable"[^>]*>[^<]*<!--\[-->Id/)
  assert.match(html, /class="text-left\s*"[^>]*>[^<]*<!--\[-->Name/)
  const cells = [...html.matchAll(/<td\b[^>]*>[\s\S]*?<\/td>/g)].map((match) => match[0])
  assert.match(cells[1], /Alice/)
  assert.doesNotMatch(cells[1], /q-select/)
  assert.match(cells[2], /q-select/)
})

test('options without an edit type still select foreign-key labels', async () => {
  const html = await render({
    extraColumnOptions: { name: { options: [{ value: 'Alice', label: 'Display name' }] } },
  })
  assert.match(html, /Display name/)
})

test('expansion, row actions and bottom visibility are configurable', async () => {
  const html = await render({
    expanded: [1],
    hideBottom: true,
    rowActionSize: 'lg',
    rowActionDense: false,
    actions: ['goto', 'clone', 'delete'],
    editable: true,
    gotoRow: () => {},
    cloneRow: () => {},
    deleteRow: () => {},
    onRowClick: () => {},
    i18n: { gotoButtonTitle: 'Open record' },
  }, {
    expand: ({ row: expandedRow }) => h('span', `Details for ${expandedRow.name}`),
  })
  assert.match(html, /Details for Alice/)
  assert.match(html, /tabindex="0"/)
  assert.match(html, /aria-label="Open record"/)
  assert.match(html, /aria-label="Clone"/)
  assert.match(html, /aria-label="Delete"/)
  assert.doesNotMatch(html, /q-table__bottom/)
})

test('rows without a click listener are not added to the tab order', async () => {
  const html = await render()
  const bodyRow = html.match(/<tbody>[\s\S]*?<tr\b[^>]*>/)?.[0]
  assert.ok(bodyRow)
  assert.doesNotMatch(bodyRow, /tabindex/)
})

test('empty table uses per-table no-data label', async () => {
  const html = await render({ data: [], i18n: { noData: 'Nothing here' } })
  assert.match(html, /Nothing here/)
})
