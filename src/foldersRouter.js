const express = require('express');
const xss = require('xss');
const logger = require('./logger');

const foldersRouter = express.Router();
const bodyParser = express.json();
const foldersService = require('./foldersService');

const serializeFolder = (folder) => ({
  id: folder.id,
  folder_name: xss(folder.folder_name),
  date_created: folder.date_created
});

foldersRouter
  .route('/api/folders')
  .get((req, res, next) => {
    const db = req.app.get('db');
    foldersService.getAllFolders(db)
      .then(folders => {
        res.json(folders.map(serializeFolder));
      })
      .catch(next);
  })
  .post(bodyParser, (req, res, next) => {
    if (!req.body['folder_name']) {
      logger.error('folder_name is requried');
      return res.status(400).send({
        error: { message: 'Missing folder_name in request body' }
      });
    }

    const { folder_name } = req.body;

    const newFolder = { folder_name };

    foldersService.insertFolder(
      req.app.get('db'),
      newFolder
    )
      .then(folder => {
        logger.info(`Folder with id ${folder.id} created.`);
        res
          .status(201)
          .location(`/api/folders/${folder.id}`)
          .json(serializeFolder(folder));
      })
      .catch(next);
  });

foldersRouter
  .route('/api/folders/:id')
  .all((req, res, next) => {
    const { id } = req.params;
    foldersService.getById(req.app.get('db'), id)
      .then(folder => {
        if (!folder) {
          logger.error(`Folder with id ${id} not found`);
          return res.status(404).json({
            error: { message: 'Folder Not Found' }
          });
        }
        res.folder = folder;
        next();
      })
      .catch(next);
  })
  .get((req, res) => {
    res.json(serializeFolder(res.folder));
  })
  .delete((req, res, next) => {
    const { id } = req.params;

    foldersService.deleteFolder(req.app.get('db'), id)
      .then(numRowsAffected => {
        logger.info(`Folder with id ${id} deleted.`);
        res.status(204).end();
      })
      .catch(next);
  })
  .patch(bodyParser, (req, res, next) => {
    const { folder_name } = req.body;
    const folderToUpdate = { folder_name };

    if (Object.keys(folderToUpdate).length < 1) {
      return res.status(400).json({
        error: { message: 'Request must contain a folder_name' }
      });
    }

    foldersService.updateFolder(
      req.app.get('db'),
      req.params.idm,
      folderToUpdate
    )
      .then(folderToUpdate => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = foldersRouter;