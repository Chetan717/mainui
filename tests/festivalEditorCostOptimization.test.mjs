import fs from 'node:fs';
import assert from 'node:assert/strict';

const list = fs.readFileSync(new URL('../src/pages/Editor/components/ListOfTemplates.jsx', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../src/pages/Homepage/Component/Services/Festival_template.jsx', import.meta.url), 'utf8');
const festival = fs.readFileSync(new URL('../src/pages/Homepage/Component/Festival.jsx', import.meta.url), 'utf8');

assert.match(list, /mainTypeLower === "general"/);
assert.match(list, /filterType === "Festival" && seededItems\.length > 0/);
assert.match(list, /getDoc\(\s*doc\(db, COLLECTIONS\.MLMTEMPLATE/);
assert.match(list, /genaral_template_json\?\.data\?\.\[selType\.id\]/);
assert.match(service, /GraphicsLink: Array\.isArray\(data\?\.GraphicsLink\)/);
assert.match(festival, /storeEditorTemplateSeed\(/);
console.log('festival editor cost optimization: PASS');
