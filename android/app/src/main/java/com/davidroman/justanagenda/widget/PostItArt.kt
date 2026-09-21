package com.davidroman.justanagenda.widget

import android.content.Context
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.BitmapShader
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.text.TextUtils
import com.davidroman.justanagenda.R
import java.io.File
import kotlin.math.max
import kotlin.math.min

// El aspecto de los widgets: post-its que parecen flotar (sombra, franja adhesiva, esquina doblada) y un
// tablero de corcho con post-its pegados con chincheta. Se dibuja en un Bitmap del tamaño del widget
// (RemoteViews no admite sombras ni giros) y el texto y los toques van encima, en vistas normales.
object PostItArt {
  // El amarillo de los post-it (NOTE_COLORS de utils/notes.ts)
  const val PAPER = 0xFFFBE164.toInt()
  const val INK = 0xFF3B3200.toInt()
  const val INK_SOFT = 0xFF7A6A1F.toInt()

  // Márgenes (dp) que el post-it deja libres en el widget para que quepa su sombra
  const val PAPER_INSET_LEFT = 10f
  const val PAPER_INSET_TOP = 8f
  const val PAPER_INSET_RIGHT = 10f
  const val PAPER_INSET_BOTTOM = 16f

  // El tablero de notas (mismo aspecto que el de la app, ver NotesBoard.tsx): marco de madera y, dentro,
  // una rejilla de post-its. GRID_INSET es lo que hay del borde del widget a la rejilla, y es el mismo en
  // el dibujo y en las zonas táctiles (notes_widget.xml)
  const val FRAME = 9f
  const val GRID_INSET = 22f
  const val CORK_TILE = 256f
  const val EDGE_DEPTH = 16f
  // Un post-it de la app mide unos 168 dp de ancho en un móvil de 411 dp (NotesBoard.tsx) y allí la letra es de
  // 15 dp y la chincheta de 20. Los del widget guardan esas proporciones según su ancho, sin agrandarse más que ahí
  const val NOTE_REFERENCE_WIDTH = 168f
  const val NOTE_MIN_SCALE = 0.7f
  const val PIN_SIZE = 20f
  // Las notas de la app son casi cuadradas: una celda no baja de este alto (y con él salen pocas filas)
  const val CELL_MIN_HEIGHT = 100f
  const val CELL_MIN_WIDTH = 96f
  const val MAX_NOTE_ROWS = 3
  const val FAB_RADIUS = 19f
  const val FAB_CENTER_FROM_RIGHT = 38f
  const val FAB_CENTER_FROM_BOTTOM = 42f
  // Los post-it del tablero se ven algo apagados junto al corcho oscuro; se aclaran un poco al dibujarlos
  // (el corcho y el marco se quedan tal cual, solo el papel de la nota)
  const val NOTE_BRIGHTEN = 1.12f
  // Lo que se oscurece el corcho y el marco de noche: el mismo NIGHT_DIM (rgba(15,8,0,0.5)) de NotesBoard.tsx
  const val NIGHT_DIM = 0x800F0800.toInt()
  // Alto (dp, a escala de la nota) de la miniatura de la primera imagen adjunta, como en NoteCard.tsx
  const val NOTE_IMAGE_HEIGHT = 100f

  private const val MAX_SIDE_PX = 1400f

  /** Lienzo del tamaño del widget; `d` son los píxeles por dp (acotados para no gastar memoria de más) */
  class Art(context: Context, widthDp: Float, heightDp: Float) {
    val d: Float
    val bitmap: Bitmap
    val canvas: Canvas

    init {
      val density = context.resources.displayMetrics.density
      d = density * min(1f, MAX_SIDE_PX / (max(widthDp, heightDp) * density))
      bitmap = Bitmap.createBitmap(
          max(1, (widthDp * d).toInt()), max(1, (heightDp * d).toInt()), Bitmap.Config.ARGB_8888)
      canvas = Canvas(bitmap)
    }

    val width get() = bitmap.width.toFloat()
    val height get() = bitmap.height.toFloat()
  }

  /** El post-it del widget de tareas: ocupa todo el widget menos el margen de la sombra */
  fun paper(context: Context, widthDp: Float, heightDp: Float): Bitmap {
    val art = Art(context, widthDp, heightDp)
    val d = art.d
    val rect = RectF(
        PAPER_INSET_LEFT * d,
        PAPER_INSET_TOP * d,
        art.width - PAPER_INSET_RIGHT * d,
        art.height - PAPER_INSET_BOTTOM * d)
    drawPostIt(art.canvas, rect, PAPER, d, foldDp = 24f, paperShade = texture(context, R.drawable.widget_paper_shade), appShadows = false)
    return art.bitmap
  }

  /** Cuántas columnas y filas de post-its caben en el tablero (mismas cuentas para dibujar y para los toques) */
  fun gridColumns(widthDp: Float) = if (widthDp >= CELL_MIN_WIDTH * 2 + GRID_INSET * 2) 2 else 1

  fun gridRows(heightDp: Float) =
      ((heightDp - GRID_INSET * 2) / CELL_MIN_HEIGHT).toInt().coerceIn(1, MAX_NOTE_ROWS)

  /**
   * El tablero: corcho con marco de madera y las notas clavadas con chincheta en una rejilla de
   * `columns` x `rows`, y el botón "+". `emptyText` se escribe en el centro si no hay notas.
   */
  fun board(
      context: Context,
      widthDp: Float,
      heightDp: Float,
      notes: List<NoteItem>,
      columns: Int,
      rows: Int,
      night: Boolean,
      emptyText: String,
  ): Bitmap {
    val art = Art(context, widthDp, heightDp)
    val d = art.d
    val canvas = art.canvas
    val board = RectF(3 * d, 2 * d, art.width - 3 * d, art.height - 9 * d)
    val radius = 14 * d

    // Sombra del tablero sobre el fondo
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    paint.color = CORK_BASE
    paint.setShadowLayer(9 * d, 0f, 4 * d, 0x66000000)
    canvas.drawRoundRect(board, radius, radius, paint)
    paint.clearShadowLayer()

    canvas.save()
    canvas.clipPath(Path().apply { addRoundRect(board, radius, radius, Path.Direction.CW) })
    drawCork(context, canvas, board, d)
    drawFrameShadow(canvas, board, d)
    // De noche se oscurece el corcho, pero ANTES de pegar los post-it: en la app los papeles van encima del
    // oscurecido (NotesBoard.tsx) y conservan todo su brillo. Oscurecerlo todo al final los dejaba apagados
    if (night) {
      paint.color = NIGHT_DIM
      canvas.drawRect(board, paint)
    }

    val grid = RectF(
        board.left - 3 * d + GRID_INSET * d,
        board.top - 2 * d + GRID_INSET * d,
        board.right + 3 * d - GRID_INSET * d,
        board.bottom + 9 * d - GRID_INSET * d)
    val cellW = grid.width() / columns
    val cellH = grid.height() / rows
    val shadeTexture = texture(context, R.drawable.widget_paper_shade)

    if (notes.isEmpty()) {
      drawCenteredText(canvas, emptyText, grid, d, if (night) 0xCCF3E3C2.toInt() else 0xCC3B2A00.toInt())
    }

    notes.take(columns * rows).forEachIndexed { index, note ->
      val cell = RectF(
          grid.left + (index % columns) * cellW,
          grid.top + (index / columns) * cellH,
          grid.left + (index % columns + 1) * cellW,
          grid.top + (index / columns + 1) * cellH)
      // Deja sitio entre post-its, para el giro y la sombra
      val paper = RectF(cell).apply { inset(8 * d, 9 * d) }
      canvas.save()
      // La app inclina cada post-it 1,5 veces lo que dice su rotación (ver PostIt.tsx)
      canvas.rotate(note.rotation * 1.5f, paper.centerX(), paper.centerY())
      drawPostIt(canvas, paper, shade(note.color, NOTE_BRIGHTEN), d, foldDp = 0f, paperShade = shadeTexture, appShadows = true)
      val scale = (paper.width() / d / NOTE_REFERENCE_WIDTH).coerceIn(NOTE_MIN_SCALE, 1f)

      // Igual que NoteCard.tsx: la imagen (si tiene) arriba, y el texto (si tiene) debajo de ella
      var textTop = paper.top + 34 * scale * d
      if (note.imageFileName != null) {
        val imageHeight = min(NOTE_IMAGE_HEIGHT * scale * d, paper.bottom - 10 * d - textTop)
        if (imageHeight >= 4 * d) {
          val imageRect = RectF(paper.left + 14 * scale * d, textTop, paper.right - 14 * scale * d, textTop + imageHeight)
          val bitmap = loadAttachmentBitmap(
              context, note.imageFileName, imageRect.width().toInt(), imageRect.height().toInt())
          if (bitmap != null) {
            drawCoverImage(canvas, bitmap, imageRect, 2 * scale * d)
            textTop = imageRect.bottom + 8 * scale * d
          }
        }
      }
      if (note.text.isNotEmpty()) drawNoteText(canvas, note.text, paper, d, scale, textTop)

      drawPin(
          canvas,
          paper.centerX() + note.pinOffset * scale * d,
          paper.top + 20 * scale * d,
          d,
          note.pinHead,
          note.pinDark,
          PIN_SIZE * scale)
      canvas.restore()
    }

    drawWoodFrame(context, canvas, board, d)
    // El marco también se oscurece de noche, pero solo él (el anillo entre el borde y el corcho), no los post-it
    if (night) {
      val frame = FRAME * d
      val ring = Path().apply {
        fillType = Path.FillType.EVEN_ODD
        addRect(board, Path.Direction.CW)
        addRect(
            RectF(board.left + frame, board.top + frame, board.right - frame, board.bottom - frame),
            Path.Direction.CW)
      }
      paint.color = NIGHT_DIM
      canvas.drawPath(ring, paint)
    }
    canvas.restore()

    drawAddButton(canvas, art.width - FAB_CENTER_FROM_RIGHT * d, art.height - FAB_CENTER_FROM_BOTTOM * d, d)
    return art.bitmap
  }

  fun isNight(context: Context) =
      context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK ==
          Configuration.UI_MODE_NIGHT_YES

  // ---------------------------------------------------------------------------------------------

  /**
   * Un post-it: sombra, papel con el sombreado de la app (`paper-shade.png`, el mismo degradado en diagonal
   * que PostIt.tsx) y, si `foldDp` > 0, la esquina inferior derecha doblada.
   *
   * Con `appShadows` la sombra son las tres capas planas de la app (lejana, "levantada" y cercana); sin
   * ellas, una sombra difusa más marcada, para que el post-it del widget de tareas flote sobre el fondo.
   */
  private fun drawPostIt(
      canvas: Canvas, rect: RectF, color: Int, d: Float, foldDp: Float, paperShade: Bitmap, appShadows: Boolean) {
    val fold = foldDp * d
    val (l, t, r, b) = listOf(rect.left, rect.top, rect.right, rect.bottom)
    val body = Path().apply {
      moveTo(l, t)
      lineTo(r, t)
      if (fold > 0) {
        lineTo(r, b - fold)
        lineTo(r - fold, b)
      } else {
        lineTo(r, b)
      }
      lineTo(l, b)
      close()
    }
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)

    if (appShadows) {
      fun layer(box: RectF, radiusDp: Float, alpha: Int, degrees: Float = 0f) {
        paint.color = alpha shl 24
        canvas.save()
        canvas.rotate(degrees, box.centerX(), box.centerY())
        canvas.drawRoundRect(box, radiusDp * d, radiusDp * d, paint)
        canvas.restore()
      }
      // Más claras que la sombra "de verdad" (18/41/56): al lado del corcho oscuro se veían las notas apagadas
      layer(RectF(l - 4 * d, t + 4 * d, r + 4 * d, b + 10 * d), 8f, 14)
      layer(RectF(l - 3 * d, t + 6 * d, r - 3 * d, b + 7 * d), 4f, 31, -1.4f)
      layer(RectF(l - 1 * d, t + 2 * d, r + 1 * d, b + 3 * d), 3f, 42)
    } else {
      // Una grande y suave, y otra pegada al papel
      paint.color = color
      paint.setShadowLayer(13 * d, 0f, 7 * d, 0x66000000)
      canvas.drawPath(body, paint)
      paint.setShadowLayer(2.5f * d, 0f, 1.3f * d, 0x55000000)
      canvas.drawPath(body, paint)
      paint.clearShadowLayer()
    }

    paint.color = color
    canvas.drawPath(body, paint)
    canvas.save()
    canvas.clipPath(body)
    canvas.drawBitmap(paperShade, null, rect, Paint(Paint.FILTER_BITMAP_FLAG))
    canvas.restore()

    if (fold > 0) {
      // La esquina doblada: el reverso del papel, más oscuro, con su propia sombra
      val flap = Path().apply {
        moveTo(r, b - fold)
        lineTo(r - fold, b)
        lineTo(r - fold, b - fold)
        close()
      }
      paint.color = shade(color, 0.86f)
      paint.setShadowLayer(4 * d, -1 * d, -1 * d, 0x55000000)
      canvas.drawPath(flap, paint)
      paint.clearShadowLayer()
      paint.shader = LinearGradient(
          r - fold, b - fold, r, b, shade(color, 1.02f), shade(color, 0.82f), Shader.TileMode.CLAMP)
      canvas.drawPath(flap, paint)
      paint.shader = null
    }
  }

  private const val CORK_BASE = 0xFFC4965F.toInt()

  private val textures = HashMap<Int, Bitmap>()

  // Las texturas (copias de assets/images/notes/ de la app) se leen una vez por proceso
  private fun texture(context: Context, resId: Int): Bitmap = synchronized(textures) {
    textures.getOrPut(resId) {
      BitmapFactory.decodeResource(context.resources, resId, BitmapFactory.Options().apply { inScaled = false })
    }
  }

  /**
   * La imagen adjunta de una nota, reducida para no gastar memoria de más; null si el archivo no está o no
   * se puede decodificar (entonces el post-it se dibuja sin ella, como si no la tuviera). El nombre ya se
   * validó al leer SharedPreferences (WidgetStorage.storedFileName) y `context.filesDir` es el mismo
   * `Paths.document` que usa expo-file-system en el lado de la app (ver services/attachments-service.ts).
   */
  private fun loadAttachmentBitmap(context: Context, fileName: String, reqWidthPx: Int, reqHeightPx: Int): Bitmap? {
    if (reqWidthPx <= 0 || reqHeightPx <= 0) return null
    val file = File(File(context.filesDir, "attachments"), fileName)
    if (!file.isFile) return null
    return runCatching {
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      BitmapFactory.decodeFile(file.path, bounds)
      if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return@runCatching null
      val options = BitmapFactory.Options().apply {
        inSampleSize = sampleSize(bounds.outWidth, bounds.outHeight, reqWidthPx, reqHeightPx)
      }
      BitmapFactory.decodeFile(file.path, options)
    }.getOrNull()
  }

  /** La mayor potencia de 2 que deja la imagen decodificada todavía más grande que lo que hace falta dibujar */
  private fun sampleSize(width: Int, height: Int, reqWidth: Int, reqHeight: Int): Int {
    var sample = 1
    while (width / (sample * 2) >= reqWidth && height / (sample * 2) >= reqHeight) sample *= 2
    return sample
  }

  /** `bitmap` recortado para llenar `rect` (como contentFit="cover" en NoteCard.tsx), con esquinas redondeadas */
  private fun drawCoverImage(canvas: Canvas, bitmap: Bitmap, rect: RectF, radius: Float) {
    canvas.save()
    canvas.clipPath(Path().apply { addRoundRect(rect, radius, radius, Path.Direction.CW) })
    val scale = max(rect.width() / bitmap.width, rect.height() / bitmap.height)
    val matrix = Matrix().apply {
      setScale(scale, scale)
      postTranslate(
          rect.left + (rect.width() - bitmap.width * scale) / 2f,
          rect.top + (rect.height() - bitmap.height * scale) / 2f)
    }
    canvas.drawBitmap(bitmap, matrix, Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG))
    canvas.restore()
  }

  /** El corcho: su textura (que encaja sin costuras) repetida hasta cubrir el tablero */
  private fun drawCork(context: Context, canvas: Canvas, board: RectF, d: Float) {
    val cork = texture(context, R.drawable.widget_cork)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    paint.color = CORK_BASE
    canvas.drawRect(board, paint)

    val shader = BitmapShader(cork, Shader.TileMode.REPEAT, Shader.TileMode.REPEAT)
    val scale = CORK_TILE * d / cork.width
    shader.setLocalMatrix(Matrix().apply {
      setScale(scale, scale)
      postTranslate(board.left, board.top)
    })
    paint.shader = shader
    paint.isFilterBitmap = true
    canvas.drawRect(board, paint)
  }

  /** El marco echa una sombra sobre el corcho, en cada borde */
  private fun drawFrameShadow(canvas: Canvas, board: RectF, d: Float) {
    val frame = FRAME * d
    val depth = EDGE_DEPTH * d
    val paint = Paint()
    val dark = 0x59000000
    val clear = 0x00000000
    fun edge(rect: RectF, x0: Float, y0: Float, x1: Float, y1: Float) {
      paint.shader = LinearGradient(x0, y0, x1, y1, dark, clear, Shader.TileMode.CLAMP)
      canvas.drawRect(rect, paint)
    }
    edge(RectF(board.left, board.top + frame, board.right, board.top + frame + depth),
        0f, board.top + frame, 0f, board.top + frame + depth)
    edge(RectF(board.left, board.bottom - frame - depth, board.right, board.bottom - frame),
        0f, board.bottom - frame, 0f, board.bottom - frame - depth)
    edge(RectF(board.left + frame, board.top, board.left + frame + depth, board.bottom),
        board.left + frame, 0f, board.left + frame + depth, 0f)
    edge(RectF(board.right - frame - depth, board.top, board.right - frame, board.bottom),
        board.right - frame, 0f, board.right - frame - depth, 0f)
  }

  /**
   * El marco de madera. Arriba y abajo con la veta a lo largo; a los lados, en vertical. Cada tira
   * tiene el canto claro por fuera y oscuro junto al corcho, así que la de abajo y la de la derecha son
   * las de arriba y la de la izquierda volteadas.
   */
  private fun drawWoodFrame(context: Context, canvas: Canvas, board: RectF, d: Float) {
    val horizontal = texture(context, R.drawable.widget_wood_h)
    val vertical = texture(context, R.drawable.widget_wood_v)
    val frame = FRAME * d
    val paint = Paint(Paint.FILTER_BITMAP_FLAG)

    fun strip(bitmap: Bitmap, rect: RectF, flipX: Boolean, flipY: Boolean) {
      canvas.save()
      canvas.scale(if (flipX) -1f else 1f, if (flipY) -1f else 1f, rect.centerX(), rect.centerY())
      canvas.drawBitmap(bitmap, null, rect, paint)
      canvas.restore()
    }
    strip(vertical, RectF(board.left, board.top, board.left + frame, board.bottom), false, false)
    strip(vertical, RectF(board.right - frame, board.top, board.right, board.bottom), true, false)
    strip(horizontal, RectF(board.left, board.top, board.right, board.top + frame), false, false)
    strip(horizontal, RectF(board.left, board.bottom - frame, board.right, board.bottom), false, true)
  }

  /**
   * La chincheta, con las proporciones de PostIt.tsx (tamaño 20): sombra inclinada 38°, pie más oscuro
   * corrido hacia abajo, cabeza con borde claro y un brillo.
   */
  private fun drawPin(canvas: Canvas, cx: Float, cy: Float, d: Float, head: Int, dark: Int, sizeDp: Float) {
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    val size = sizeDp * d
    val r = size / 2

    canvas.save()
    canvas.rotate(38f, cx + 0.375f * size, cy + 0.3f * size)
    paint.color = 0x4D000000
    canvas.drawRoundRect(
        RectF(cx + 0.375f * size - 0.475f * size, cy + 0.3f * size - 0.25f * size,
            cx + 0.375f * size + 0.475f * size, cy + 0.3f * size + 0.25f * size),
        0.25f * size, 0.25f * size, paint)
    canvas.restore()

    paint.color = dark
    canvas.drawCircle(cx + 0.1f * size, cy + 0.1f * size, r, paint)
    paint.color = head
    canvas.drawCircle(cx, cy, r, paint)
    paint.style = Paint.Style.STROKE
    paint.strokeWidth = d
    paint.color = 0x47FFFFFF
    canvas.drawCircle(cx, cy, r - 0.5f * d, paint)

    paint.style = Paint.Style.FILL
    paint.color = 0xBFFFFFFF.toInt()
    canvas.save()
    val gx = cx - 0.125f * size
    val gy = cy - 0.225f * size
    canvas.rotate(-35f, gx, gy)
    canvas.drawOval(RectF(gx - 0.175f * size, gy - 0.125f * size, gx + 0.175f * size, gy + 0.125f * size), paint)
    canvas.restore()
  }

  private fun drawAddButton(canvas: Canvas, cx: Float, cy: Float, d: Float) {
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    val radius = FAB_RADIUS * d
    paint.color = 0xFF4E2F17.toInt()
    paint.setShadowLayer(6 * d, 0f, 3 * d, 0x99000000.toInt())
    canvas.drawCircle(cx, cy, radius, paint)
    paint.clearShadowLayer()
    paint.style = Paint.Style.STROKE
    paint.strokeWidth = 1 * d
    paint.color = 0x33FFFFFF
    canvas.drawCircle(cx, cy, radius - 0.5f * d, paint)
    paint.color = 0xFFF3E3C2.toInt()
    paint.strokeCap = Paint.Cap.ROUND
    paint.strokeWidth = 2.6f * d
    canvas.drawLine(cx - 7 * d, cy, cx + 7 * d, cy, paint)
    canvas.drawLine(cx, cy - 7 * d, cx, cy + 7 * d, paint)
  }

  private fun drawNoteText(canvas: Canvas, text: String, paper: RectF, d: Float, scale: Float, top: Float) {
    val area = RectF(
        paper.left + 14 * scale * d,
        top,
        paper.right - 14 * scale * d,
        paper.bottom - 10 * d)
    if (area.width() < 4 * d || area.height() < 4 * d) return

    val paint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
      color = INK
      textSize = 15 * scale * d
      typeface = Typeface.create("sans-serif", Typeface.NORMAL)
    }
    val lineHeight = paint.fontSpacing * 1.06f
    val maxLines = max(1, (area.height() / lineHeight).toInt())
    val layout = StaticLayout.Builder.obtain(text, 0, text.length, paint, area.width().toInt())
        .setMaxLines(maxLines)
        .setEllipsize(TextUtils.TruncateAt.END)
        .setLineSpacing(0f, 1.06f)
        .build()
    canvas.save()
    canvas.translate(area.left, area.top)
    layout.draw(canvas)
    canvas.restore()
  }

  private fun drawCenteredText(canvas: Canvas, text: String, area: RectF, d: Float, color: Int) {
    val paint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
      this.color = color
      textSize = 15 * d
      typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
    }
    val layout = StaticLayout.Builder.obtain(text, 0, text.length, paint, max(1, (area.width() - 60 * d).toInt()))
        .setAlignment(Layout.Alignment.ALIGN_CENTER)
        .build()
    canvas.save()
    canvas.translate(area.centerX() - layout.width / 2f, area.centerY() - layout.height / 2f)
    layout.draw(canvas)
    canvas.restore()
  }

  /** Aclara (factor > 1) u oscurece (< 1) un color */
  fun shade(color: Int, factor: Float): Int {
    val hsv = FloatArray(3)
    Color.colorToHSV(color, hsv)
    hsv[2] = (hsv[2] * factor).coerceIn(0f, 1f)
    if (factor > 1f) hsv[1] = (hsv[1] / factor).coerceIn(0f, 1f)
    return Color.HSVToColor(Color.alpha(color), hsv)
  }
}
