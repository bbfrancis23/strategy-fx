import { getSession } from 'next-auth/react';

import Item from '/mongo/schemas/ItemSchema';
import db from '/mongo/db';
import { getItems } from '/mongo/controllers/itemOld';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const result = await getItems();
    res.status(result.status).json({
      message: result.message,
      items: result.items,
    });
  } else if (req.method === 'POST') {
    await db.connect();

    const session = await getSession({ req });
    const isSiteAdmin = session?.user.roles.includes('SiteAdmin');

    if (!isSiteAdmin) {
      await db.disconnect();
      res.status(401).json({ message: 'Not Authenticated.' });
      return;
    }

    const item = new Item({ title: '' });

    try {
      await item.save();
    } catch (e) {
      await db.disconnect();
      res.status(500).json({ message: `Error Creating Item ${e}` });
      return;
    }

    res.status(201).json({
      message: 'Item Created',
      item: item.toObject({ getters: true }),
    });
  }
}
