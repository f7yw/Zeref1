/**
 * SupabaseDB — قاعدة بيانات سحابية احترافية
 * • يكتب على Supabase كأولوية
 * • نسخة احتياطية محلية عند أي فشل
 * • مزامنة دورية كل دقيقتين
 * • تسجيل دقيق لكل عملية
 */
import { createClient } from '@supabase/supabase-js'
import _fs, { existsSync, readFileSync } from 'fs'
const { promises: fs } = _fs
import { resolve } from 'path'

const TABLE_NAME   = 'bot_data'
const ROW_ID       = 1
const FALLBACK_FILE = resolve('database.supabase.json')
const SYNC_INTERVAL = 2 * 60 * 1000   // مزامنة كل دقيقتين

export class SupabaseDB {
  constructor(url, key) {
    this.client        = createClient(url, key)
    this.data          = {}
    this._tableReady   = null
    this._errorLogged  = false
    this._dirty        = false          // يُعلم أن هناك تغييرات لم تُحفظ بعد
    this._syncTimer    = null
    this._lastSyncAt   = null
    this._syncErrors   = 0
    this._cloudOk      = null           // null = لم يُحدَّد بعد
    this._startAutoSync()
  }

  // ── قراءة محلية ──────────────────────────────────────────────────────────
  _localRead() {
    try {
      return existsSync(FALLBACK_FILE)
        ? JSON.parse(readFileSync(FALLBACK_FILE, 'utf-8'))
        : {}
    } catch { return {} }
  }

  // ── كتابة محلية ──────────────────────────────────────────────────────────
  async _localWrite(data) {
    try {
      await fs.writeFile(FALLBACK_FILE, JSON.stringify(data, null, 2))
    } catch (e) {
      console.error('[DB] Local fallback write error:', e.message)
    }
  }

  // ── التحقق من وجود الجدول ────────────────────────────────────────────────
  async _checkTable() {
    if (this._tableReady === true) return true
    try {
      const { error } = await this.client.from(TABLE_NAME).select('id').limit(1)
      if (!error) {
        this._tableReady = true
        this._cloudOk = true
        return true
      }
      this._tableReady = false
      this._cloudOk = false
      return false
    } catch {
      this._tableReady = false
      this._cloudOk = false
      return false
    }
  }

  // ── قراءة البيانات ────────────────────────────────────────────────────────
  async read() {
    const ready = await this._checkTable()

    if (!ready) {
      if (!this._errorLogged) {
        console.warn('[DB] ⚠️  Supabase table not ready — using local fallback.')
        console.warn('[DB] Run supabase_setup.sql in your Supabase SQL Editor.')
        this._errorLogged = true
      }
      this.data = this._localRead()
      return this.data
    }

    try {
      const { data, error } = await this.client
        .from(TABLE_NAME)
        .select('data')
        .eq('id', ROW_ID)
        .single()

      if (error?.code === 'PGRST116') {
        // صف جديد — نُنشئه
        await this.client.from(TABLE_NAME).insert({ id: ROW_ID, data: {} })
        this.data = {}
        console.log('[DB] ☁️  Created new Supabase row.')
      } else if (error) {
        console.error('[DB] Read error:', error.message)
        this.data = this._localRead()
      } else {
        this.data = data?.data || {}
        this._cloudOk = true
        console.log('[DB] ☁️  Data loaded from Supabase ✅')
      }
    } catch (e) {
      console.error('[DB] Read exception:', e.message)
      this.data = this._localRead()
    }

    return this.data
  }

  // ── كتابة البيانات ────────────────────────────────────────────────────────
  async write(data) {
    const payload = data !== undefined ? data : this.data
    this._dirty = false

    // دائماً احفظ نسخة محلية أولاً
    await this._localWrite(payload)

    const ready = await this._checkTable()
    if (!ready) return

    try {
      const { error } = await this.client
        .from(TABLE_NAME)
        .upsert(
          { id: ROW_ID, data: payload, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        )

      if (error) {
        this._syncErrors++
        this._cloudOk = false
        console.error('[DB] Write error:', error.message)
      } else {
        this._lastSyncAt = Date.now()
        this._syncErrors = 0
        this._cloudOk = true
      }
    } catch (e) {
      this._syncErrors++
      this._cloudOk = false
      console.error('[DB] Write exception:', e.message)
    }
  }

  // ── وضع علامة "تغيير معلّق" ─────────────────────────────────────────────
  markDirty() {
    this._dirty = true
  }

  // ── مزامنة دورية تلقائية ─────────────────────────────────────────────────
  _startAutoSync() {
    if (this._syncTimer) clearInterval(this._syncTimer)
    this._syncTimer = setInterval(async () => {
      if (!this._dirty) return
      await this.write()
    }, SYNC_INTERVAL)
    // لا نوقف العملية عند الخروج
    if (this._syncTimer?.unref) this._syncTimer.unref()
  }

  // ── حالة الاتصال ─────────────────────────────────────────────────────────
  get status() {
    return {
      cloud:      this._cloudOk,
      lastSync:   this._lastSyncAt,
      errors:     this._syncErrors,
      dirty:      this._dirty,
      users:      Object.keys(this.data?.users || {}).length,
      chats:      Object.keys(this.data?.chats || {}).length,
    }
  }
}
