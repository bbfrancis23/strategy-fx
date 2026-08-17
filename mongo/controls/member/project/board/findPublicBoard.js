import db from '@/mongo/db'

import Board from '@/mongo/schemas/BoardSchema'

import Column from '@/mongo/schemas/ColumnSchema'
import Item from '@/mongo/schemas/ItemSchema'

import Section from '@/mongo/schemas/SectionSchema'
import Checkbox from '@/mongo/schemas/CheckboxSchema'

export const findPublicBoard = async (id) => {
  let board = undefined

  await db.connect()

  board = await Board.findOne({
    _id: id,
    archive: {$ne: true},
  }).populate({
    path: 'columns',
    match: {archive: {$ne: true}},
    populate: {
      path: 'items',
      model: Item,
      match: {archive: {$ne: true}},
      populate: {
        path: 'sections',
        model: Section,
        populate: [
          {
            path: 'checkboxes',
            model: Checkbox,
          },
        ],
      },
    },
  })

  if (!board) {
    await db.disconnect()
    return null
  }

  board = board.toObject({getters: true, flattenMaps: true})

  board = await JSON.stringify(board)
  board = await JSON.parse(board)
  await db.disconnect()

  return board
}

export default findPublicBoard
