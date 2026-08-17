import db from '@/mongo/db'

import Board from '@/mongo/schemas/BoardSchema'
// import Project from '@/mongo/schemas/ProjectSchema';

import Column from '@/mongo/schemas/ColumnSchema'
import Item from '@/mongo/schemas/ItemSchema'

import Section from '@/mongo/schemas/SectionSchema'

export const findProjectItems = async (projectId) => {
  let items = []

  await db.connect()

  let boards = await Board.find({project: projectId}).populate({
    path: 'columns',
    match: {archive: {$ne: true}},
    model: Column,
    populate: {path: 'items', match: {archive: {$ne: true}}, model: Item},
  })

  boards = await JSON.stringify(boards)
  boards = await JSON.parse(boards)

  boards.forEach((b) => {
    b.columns.forEach((c) => {
      c.items = c.items.map((i) => ({
        ...i,
        category: b.title,
      }))

      items = items.concat(c.items)
    })
  })

  items = await JSON.stringify(items)
  items = await JSON.parse(items)
  await db.disconnect()

  return items
}

export default findProjectItems
