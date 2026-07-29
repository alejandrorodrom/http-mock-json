'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const { request, expectStatus, expectEqual, expectHeader } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/store-list',
  description: 'HTTP: store.list multi-sort, cursor, links, filters, search, templates, 400s',
  run: () => runHttpUseCase({
    name: 'runtime/store-list',
    description: 'HTTP: store.list multi-sort, cursor, links, filters, search, templates, 400s',
    mockRelativePath: 'mocks/31-store-list.json',
    timeoutMs: 25000,
    async assert({ baseUrl }) {
      const failures = [];

      const page1 = await request(`${ baseUrl }/api/products`);
      failures.push(...expectStatus(page1.status, 200, 'products default page'));
      failures.push(...expectHeader(page1.headers, 'x-total-count', '5', 'total header'));
      failures.push(...expectEqual(page1.body.total, 5, 'products total'));
      failures.push(...expectEqual(page1.body.page, 1, 'products page'));
      failures.push(...expectEqual(page1.body.pageSize, 2, 'products pageSize'));
      failures.push(...expectEqual(page1.body.totalPages, 3, 'products totalPages'));
      failures.push(...expectEqual(page1.body.hasNext, true, 'page1 hasNext'));
      failures.push(...expectEqual(page1.body.hasPrevious, false, 'page1 hasPrevious'));
      failures.push(...expectEqual(page1.body.previous, null, 'page1 previous null'));
      if (typeof page1.body.next !== 'string' || !page1.body.next.includes('page=2')) {
        failures.push(`page1 next should include page=2, got ${ JSON.stringify(page1.body.next) }`);
      }
      const link1 = page1.headers.get('link') || '';
      if (!link1.includes('rel="next"') || link1.includes('rel="prev"')) {
        failures.push(`page1 Link header unexpected: ${ link1 }`);
      }
      failures.push(...expectEqual(
        page1.body.data.map(item => item.id),
        [1, 2],
        'products default page ids'
      ));

      const page2 = await request(`${ baseUrl }/api/products?page=2&limit=2`);
      failures.push(...expectStatus(page2.status, 200, 'page2 limit alias'));
      failures.push(...expectEqual(page2.body.hasNext, true, 'page2 hasNext'));
      failures.push(...expectEqual(page2.body.hasPrevious, true, 'page2 hasPrevious'));
      if (typeof page2.body.previous !== 'string' || !page2.body.previous.includes('page=1')) {
        failures.push(`page2 previous should include page=1, got ${ JSON.stringify(page2.body.previous) }`);
      }
      failures.push(...expectEqual(
        page2.body.data.map(item => item.id),
        [3, 4],
        'page2 ids via limit alias'
      ));

      const sorted = await request(`${ baseUrl }/api/products?sort=price&order=asc&pageSize=10`);
      failures.push(...expectStatus(sorted.status, 200, 'sort price asc'));
      failures.push(...expectEqual(
        sorted.body.data.map(item => item.price),
        [5, 10, 20, 30, 40],
        'sorted prices'
      ));
      failures.push(...expectEqual(sorted.body.sort, 'price', 'sort field echo'));
      failures.push(...expectEqual(sorted.body.order, 'asc', 'order echo'));
      failures.push(...expectEqual(sorted.body.next, null, 'full page no next'));

      const sortedDesc = await request(`${ baseUrl }/api/products?sort=name&order=desc&pageSize=10`);
      failures.push(...expectStatus(sortedDesc.status, 200, 'sort name desc'));
      failures.push(...expectEqual(
        sortedDesc.body.data.map(item => item.name),
        ['Echo', 'Delta', 'Charlie', 'Bravo', 'Alpha'],
        'sorted names desc'
      ));

      const filtered = await request(`${ baseUrl }/api/products?status=active&pageSize=10`);
      failures.push(...expectStatus(filtered.status, 200, 'filter status'));
      failures.push(...expectEqual(filtered.body.total, 3, 'active total'));
      failures.push(...expectEqual(
        filtered.body.data.map(item => item.id),
        [1, 3, 4],
        'active ids'
      ));

      const searched = await request(`${ baseUrl }/api/products?q=cha&pageSize=10`);
      failures.push(...expectStatus(searched.status, 200, 'search q'));
      failures.push(...expectEqual(searched.body.total, 1, 'search total'));
      failures.push(...expectEqual(searched.body.data[0]?.name, 'Charlie', 'search name'));

      const minPrice = await request(`${ baseUrl }/api/products?minPrice=20&pageSize=10`);
      failures.push(...expectStatus(minPrice.status, 200, 'filter gte'));
      failures.push(...expectEqual(
        minPrice.body.data.map(item => item.price).sort((a, b) => a - b),
        [20, 30, 40],
        'gte prices'
      ));

      const maxPrice = await request(`${ baseUrl }/api/products?maxPrice=10&pageSize=10`);
      failures.push(...expectStatus(maxPrice.status, 200, 'filter lte'));
      failures.push(...expectEqual(
        maxPrice.body.data.map(item => item.price).sort((a, b) => a - b),
        [5, 10],
        'lte prices'
      ));

      const between = await request(
        `${ baseUrl }/api/products?minPrice=10&maxPrice=30&status=active&pageSize=10`
      );
      failures.push(...expectStatus(between.status, 200, 'filter between + eq'));
      failures.push(...expectEqual(
        between.body.data.map(item => item.id).sort((a, b) => a - b),
        [1, 3],
        'between active ids'
      ));

      const nameIn = await request(
        `${ baseUrl }/api/products?name=Alpha,Charlie&pageSize=10`
      );
      failures.push(...expectStatus(nameIn.status, 200, 'filter in csv'));
      failures.push(...expectEqual(
        nameIn.body.data.map(item => item.name).sort(),
        ['Alpha', 'Charlie'],
        'in names csv'
      ));

      const nameInMulti = await request(
        `${ baseUrl }/api/products?name=Alpha&name=Echo&pageSize=10`
      );
      failures.push(...expectStatus(nameInMulti.status, 200, 'filter in multi'));
      failures.push(...expectEqual(
        nameInMulti.body.data.map(item => item.name).sort(),
        ['Alpha', 'Echo'],
        'in names multi'
      ));

      const badMinPrice = await request(`${ baseUrl }/api/products?minPrice=abc`);
      failures.push(...expectStatus(badMinPrice.status, 400, 'gte non-number'));
      failures.push(...expectEqual(
        badMinPrice.body,
        { message: 'Query "minPrice" must be a number' },
        'gte message'
      ));

      const badMaxPrice = await request(`${ baseUrl }/api/products?maxPrice=nan`);
      failures.push(...expectStatus(badMaxPrice.status, 400, 'lte non-number'));
      failures.push(...expectEqual(
        badMaxPrice.body,
        { message: 'Query "maxPrice" must be a number' },
        'lte message'
      ));

      const badGtPrice = await request(`${ baseUrl }/api/products?gtPrice=x`);
      failures.push(...expectStatus(badGtPrice.status, 400, 'gt non-number'));
      failures.push(...expectEqual(
        badGtPrice.body,
        { message: 'Query "gtPrice" must be a number' },
        'gt message'
      ));

      const badLtPrice = await request(`${ baseUrl }/api/products?ltPrice=`);
      failures.push(...expectStatus(badLtPrice.status, 400, 'lt empty'));
      failures.push(...expectEqual(
        badLtPrice.body,
        { message: 'Query "ltPrice" must not be empty' },
        'lt empty message'
      ));

      const emptyIn = await request(`${ baseUrl }/api/products?name=`);
      failures.push(...expectStatus(emptyIn.status, 400, 'in empty'));
      failures.push(...expectEqual(
        emptyIn.body,
        { message: 'Query "name" must not be empty' },
        'in empty message'
      ));

      const emptyEq = await request(`${ baseUrl }/api/products?status=`);
      failures.push(...expectStatus(emptyEq.status, 400, 'eq empty'));
      failures.push(...expectEqual(
        emptyEq.body,
        { message: 'Query "status" must not be empty' },
        'eq empty message'
      ));

      const gtPrice = await request(`${ baseUrl }/api/products?gtPrice=20&pageSize=10`);
      failures.push(...expectStatus(gtPrice.status, 200, 'filter gt'));
      failures.push(...expectEqual(
        gtPrice.body.data.map(item => item.price).sort((a, b) => a - b),
        [30, 40],
        'gt prices'
      ));

      const ltPrice = await request(`${ baseUrl }/api/products?ltPrice=10&pageSize=10`);
      failures.push(...expectStatus(ltPrice.status, 200, 'filter lt'));
      failures.push(...expectEqual(
        ltPrice.body.data.map(item => item.price),
        [5],
        'lt prices'
      ));

      const excludeDraft = await request(
        `${ baseUrl }/api/products?excludeStatus=draft&pageSize=10`
      );
      failures.push(...expectStatus(excludeDraft.status, 200, 'filter ne'));
      failures.push(...expectEqual(excludeDraft.body.total, 3, 'ne total'));
      failures.push(...expectEqual(
        excludeDraft.body.data.every(item => item.status !== 'draft'),
        true,
        'ne no drafts'
      ));

      const nested = await request(`${ baseUrl }/api/products?region=eu&pageSize=10`);
      failures.push(...expectStatus(nested.status, 200, 'nested path'));
      failures.push(...expectEqual(nested.body.total, 2, 'eu total'));
      failures.push(...expectEqual(
        nested.body.data.map(item => item.id).sort((a, b) => a - b),
        [1, 3],
        'eu ids'
      ));

      const nestedMiss = await request(`${ baseUrl }/api/products?region=antarctica&pageSize=10`);
      failures.push(...expectStatus(nestedMiss.status, 200, 'nested miss'));
      failures.push(...expectEqual(nestedMiss.body.total, 0, 'nested miss total'));
      failures.push(...expectEqual(nestedMiss.body.data, [], 'nested miss empty'));

      const orSkipped = await request(`${ baseUrl }/api/products?pageSize=10`);
      failures.push(...expectStatus(orSkipped.status, 200, 'or skipped without params'));
      failures.push(...expectEqual(orSkipped.body.total, 5, 'or skipped keeps all'));

      const orMatch = await request(
        `${ baseUrl }/api/products?anyStatus=draft&anyRegion=latam&pageSize=10`
      );
      failures.push(...expectStatus(orMatch.status, 200, 'filter or'));
      failures.push(...expectEqual(
        orMatch.body.data.map(item => item.id).sort((a, b) => a - b),
        [2, 4, 5],
        'or ids draft or latam'
      ));

      const orSingle = await request(
        `${ baseUrl }/api/products?anyRegion=eu&pageSize=10`
      );
      failures.push(...expectStatus(orSingle.status, 200, 'or single param'));
      failures.push(...expectEqual(
        orSingle.body.data.map(item => item.id).sort((a, b) => a - b),
        [1, 3],
        'or single eu ids'
      ));

      const multiSort = await request(
        `${ baseUrl }/api/products?sort=status,-price&pageSize=10`
      );
      const multiSortOk = await request(
        `${ baseUrl }/api/products?sort=price:desc,name:asc&pageSize=10`
      );
      failures.push(...expectStatus(multiSortOk.status, 200, 'multi-sort'));
      failures.push(...expectEqual(
        multiSortOk.body.data.map(item => item.price),
        [40, 30, 20, 10, 5],
        'multi-sort prices desc'
      ));
      failures.push(...expectEqual(multiSortOk.body.sort, 'price:desc,name:asc', 'sort echo'));

      const signedSort = await request(`${ baseUrl }/api/products?sort=-price&pageSize=10`);
      failures.push(...expectStatus(signedSort.status, 200, 'signed sort'));
      failures.push(...expectEqual(
        signedSort.body.data.map(item => item.price),
        [40, 30, 20, 10, 5],
        'signed -price'
      ));

      const nestedSort = await request(
        `${ baseUrl }/api/products?sort=meta.region&order=asc&pageSize=10`
      );
      failures.push(...expectStatus(nestedSort.status, 200, 'nested sort'));
      failures.push(...expectEqual(
        nestedSort.body.data.map(item => item.id),
        [1, 3, 4, 2, 5],
        'nested sort region asc ids'
      ));

      const badSort = await request(`${ baseUrl }/api/products?sort=unknown`);
      failures.push(...expectStatus(badSort.status, 400, 'disallowed sort'));
      failures.push(...expectEqual(
        badSort.body,
        { message: 'Query "sort" field must be one of: id, name, price, meta.region' },
        'bad sort message'
      ));
      if (multiSort.status !== 400) {
        failures.push('Expected status field in multi-sort to be rejected');
      }

      const badPage = await request(`${ baseUrl }/api/products?page=0`);
      failures.push(...expectStatus(badPage.status, 400, 'page 0'));

      const badOrder = await request(`${ baseUrl }/api/products?order=up`);
      failures.push(...expectStatus(badOrder.status, 400, 'bad order'));

      const events = await request(`${ baseUrl }/api/events?offset=2&limit=2`);
      failures.push(...expectStatus(events.status, 200, 'events offset'));
      failures.push(...expectEqual(
        events.body.results.map(item => item.id),
        [3, 4],
        'events offset slice'
      ));
      failures.push(...expectEqual(events.body.meta, {
        count: 4,
        offset: 2,
        limit: 2
      }, 'events meta'));
      failures.push(...expectEqual(events.body.next, null, 'events last page next null'));
      if (typeof events.body.previous !== 'string' || !events.body.previous.includes('offset=0')) {
        failures.push(
          `events previous should include offset=0, got ${ JSON.stringify(events.body.previous) }`
        );
      }

      const tags = await request(`${ baseUrl }/api/tags?page=1&pageSize=2&sort=label&order=asc`);
      failures.push(...expectStatus(tags.status, 200, 'tags list true array'));
      failures.push(...expectEqual(
        tags.body.map(item => item.label),
        ['a', 'm'],
        'tags sorted paginated array'
      ));

      const plain = await request(`${ baseUrl }/api/plain`);
      failures.push(...expectStatus(plain.status, 200, 'plain list false'));
      failures.push(...expectEqual(plain.body.length, 2, 'plain full array'));
      failures.push(...expectEqual(
        plain.body.map(item => item.id),
        [1, 2],
        'plain ids'
      ));

      const defaults = await request(`${ baseUrl }/api/defaults`);
      failures.push(...expectStatus(defaults.status, 200, 'defaults omit list'));
      failures.push(...expectEqual(defaults.body.length, 10, 'defaults pageSize 10'));
      failures.push(...expectEqual(
        defaults.body.map(item => item.id),
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        'defaults first page ids'
      ));

      const defaultsPage2 = await request(`${ baseUrl }/api/defaults?page=2`);
      failures.push(...expectStatus(defaultsPage2.status, 200, 'defaults page 2'));
      failures.push(...expectEqual(
        defaultsPage2.body.map(item => item.id),
        [11],
        'defaults page 2 ids'
      ));

      const defaultsPageSize = await request(`${ baseUrl }/api/defaults?pageSize=1`);
      failures.push(...expectStatus(defaultsPageSize.status, 200, 'defaults pageSize 1'));
      failures.push(...expectEqual(
        defaultsPageSize.body.map(item => item.id),
        [1],
        'defaults pageSize 1 ids'
      ));

      const defaultsBadPage = await request(`${ baseUrl }/api/defaults?page=abc`);
      failures.push(...expectStatus(defaultsBadPage.status, 400, 'defaults invalid page'));

      const feed1 = await request(`${ baseUrl }/api/feed`);
      failures.push(...expectStatus(feed1.status, 200, 'feed first page'));
      failures.push(...expectEqual(feed1.body.has_more, true, 'feed has_more'));
      failures.push(...expectEqual(
        feed1.body.data.map(item => item.meta.score),
        [50, 40],
        'feed first nested scores'
      ));
      if (typeof feed1.body.next_cursor !== 'string' || feed1.body.next_cursor.length === 0) {
        failures.push('Expected next_cursor on first feed page');
      }
      if (typeof feed1.body.next !== 'string' || !feed1.body.next.includes('starting_after=')) {
        failures.push(`Expected next URL with starting_after, got ${ JSON.stringify(feed1.body.next) }`);
      }

      const feed2 = await request(
        `${ baseUrl }/api/feed?starting_after=${ encodeURIComponent(feed1.body.next_cursor) }`
      );
      failures.push(...expectStatus(feed2.status, 200, 'feed second page'));
      failures.push(...expectEqual(
        feed2.body.data.map(item => item.meta.score),
        [30, 20],
        'feed second nested scores'
      ));
      failures.push(...expectEqual(feed2.body.has_more, true, 'feed2 has_more'));

      const feed3 = await request(
        `${ baseUrl }/api/feed?starting_after=${ encodeURIComponent(feed2.body.next_cursor) }`
      );
      failures.push(...expectStatus(feed3.status, 200, 'feed last page'));
      failures.push(...expectEqual(
        feed3.body.data.map(item => item.meta.score),
        [10],
        'feed last nested scores'
      ));
      failures.push(...expectEqual(feed3.body.has_more, false, 'feed3 has_more'));
      failures.push(...expectEqual(feed3.body.next_cursor, null, 'feed3 next_cursor null'));

      const badCursor = await request(`${ baseUrl }/api/feed?starting_after=%%%`);
      failures.push(...expectStatus(badCursor.status, 400, 'bad cursor'));

      const mixedDefault = await request(`${ baseUrl }/api/mixed`);
      failures.push(...expectStatus(mixedDefault.status, 200, 'mixed default page'));
      failures.push(...expectEqual(mixedDefault.body.page, 1, 'mixed default page=1'));
      failures.push(...expectEqual(
        mixedDefault.body.data.map(item => item.id),
        [1, 2],
        'mixed default ids'
      ));
      failures.push(...expectEqual(mixedDefault.body.next_cursor, null, 'mixed default no cursor'));
      if (typeof mixedDefault.body.next !== 'string' || !mixedDefault.body.next.includes('page=2')) {
        failures.push(
          `mixed default next should be page mode, got ${ JSON.stringify(mixedDefault.body.next) }`
        );
      }

      const mixedOffset = await request(`${ baseUrl }/api/mixed?offset=2`);
      failures.push(...expectStatus(mixedOffset.status, 200, 'mixed offset mode'));
      failures.push(...expectEqual(mixedOffset.body.offset, 2, 'mixed offset=2'));
      failures.push(...expectEqual(
        mixedOffset.body.data.map(item => item.id),
        [3, 4],
        'mixed offset ids'
      ));
      failures.push(...expectEqual(mixedOffset.body.next_cursor, null, 'mixed offset no cursor'));

      const mixedPageWins = await request(`${ baseUrl }/api/mixed?page=2&offset=0`);
      failures.push(...expectStatus(mixedPageWins.status, 200, 'mixed page wins'));
      failures.push(...expectEqual(mixedPageWins.body.page, 2, 'mixed page=2 wins over offset'));
      failures.push(...expectEqual(
        mixedPageWins.body.data.map(item => item.id),
        [3, 4],
        'mixed page2 ids'
      ));
      if (
        typeof mixedPageWins.body.next === 'string'
        && mixedPageWins.body.next.includes('offset=')
        && !mixedPageWins.body.next.includes('page=')
      ) {
        failures.push('mixed page+offset should stay in page mode');
      }

      const mixedBadCursor = await request(
        `${ baseUrl }/api/mixed?starting_after=placeholder`
      );
      failures.push(...expectStatus(mixedBadCursor.status, 400, 'mixed bad cursor token'));

      const cursorPayload = Buffer.from(
        JSON.stringify({ s: [2], k: [2] }),
        'utf8'
      ).toString('base64url');
      const mixedCursor = await request(
        `${ baseUrl }/api/mixed?starting_after=${ encodeURIComponent(cursorPayload) }`
      );
      failures.push(...expectStatus(mixedCursor.status, 200, 'mixed cursor mode'));
      failures.push(...expectEqual(mixedCursor.body.has_more, false, 'mixed cursor has_more'));
      failures.push(...expectEqual(
        mixedCursor.body.data.map(item => item.id),
        [3, 4],
        'mixed cursor after id=2'
      ));
      failures.push(...expectEqual(mixedCursor.body.next_cursor, null, 'mixed cursor done'));

      const mixedOffsetOverCursor = await request(
        `${ baseUrl }/api/mixed?offset=1&starting_after=${ encodeURIComponent(cursorPayload) }`
      );
      failures.push(...expectStatus(mixedOffsetOverCursor.status, 200, 'offset beats cursor'));
      failures.push(...expectEqual(mixedOffsetOverCursor.body.offset, 1, 'offset preferred'));
      failures.push(...expectEqual(
        mixedOffsetOverCursor.body.data.map(item => item.id),
        [2, 3],
        'offset over cursor ids'
      ));
      failures.push(...expectEqual(
        mixedOffsetOverCursor.body.next_cursor,
        null,
        'offset mode clears cursor token echo'
      ));

      return failures;
    }
  })
};
