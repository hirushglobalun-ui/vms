import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return null;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading db.json:', err);
    return null;
  }
}

function writeDb(data: any) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing db.json:', err);
    return false;
  }
}

export async function GET() {
  const data = readDb();
  if (!data) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const current = readDb() || {
      users: [],
      clients: [],
      vehicles: [],
      documents: [],
      tasks: [],
      notifications: [],
      activityLogs: [],
      settings: {},
    };

    const { action, entity, data, payload } = body;

    if (action === 'SYNC_ALL' && payload) {
      writeDb({ ...current, ...payload });
      return NextResponse.json({ success: true });
    }

    if (action === 'SAVE_ENTITY' && entity && data) {
      if (Array.isArray(current[entity])) {
        const list: any[] = current[entity];
        const existingIdx = list.findIndex((item: any) => item.id === data.id);
        if (existingIdx >= 0) {
          list[existingIdx] = { ...list[existingIdx], ...data };
        } else {
          list.unshift(data);
        }
        current[entity] = list;
      } else {
        current[entity] = data;
      }
      writeDb(current);
      return NextResponse.json({ success: true });
    }

    if (action === 'DELETE_ENTITY' && entity && data?.id) {
      if (Array.isArray(current[entity])) {
        current[entity] = current[entity].filter((item: any) => item.id !== data.id);
      }
      writeDb(current);
      return NextResponse.json({ success: true });
    }

    if (action === 'SET_COLLECTION' && entity && Array.isArray(data)) {
      current[entity] = data;
      writeDb(current);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
