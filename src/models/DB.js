import model  from '../helpers/model';

export default model({
  get: () => ({
    transform: db => {
      db.outfitIds = Object.keys(db.outfits).map(id => +id);
      return db;
    },
    // TODO: Figure out IndexDB as it may allow for ~50MB amount data
    // cache: `okDB`,
    url:   `../static/db.json`
  })
});
