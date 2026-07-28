import { Router } from 'express';
import { supabase } from '../utils/supabase.js';

export const templateRouter = Router();

const DEFAULT_TEMPLATES = [
  {
    name: 'Bold Yellow',
    is_public: true,
    style: {
      font_family: 'Arial',
      font_size: 52,
      font_color: '#FFD700',
      font_bold: true,
      font_italic: false,
      background_type: 'semi-transparent',
      background_color: '#000000',
      animation_style: 'word-highlight',
      position: 'bottom',
    },
  },
  {
    name: 'Minimal White',
    is_public: true,
    style: {
      font_family: 'Helvetica',
      font_size: 44,
      font_color: '#FFFFFF',
      font_bold: false,
      font_italic: false,
      background_type: 'semi-transparent',
      background_color: '#000000',
      animation_style: 'none',
      position: 'bottom',
    },
  },
  {
    name: 'Neon Glow',
    is_public: true,
    style: {
      font_family: 'Impact',
      font_size: 56,
      font_color: '#00FF88',
      font_bold: true,
      font_italic: false,
      background_type: 'solid',
      background_color: '#1a0033',
      animation_style: 'word-highlight',
      position: 'bottom',
    },
  },
  {
    name: 'Clean Dark',
    is_public: true,
    style: {
      font_family: 'Arial',
      font_size: 40,
      font_color: '#E0E0E0',
      font_bold: false,
      font_italic: false,
      background_type: 'solid',
      background_color: '#1a1a1a',
      animation_style: 'none',
      position: 'bottom',
    },
  },
  {
    name: 'Cinematic',
    is_public: true,
    style: {
      font_family: 'Times New Roman',
      font_size: 48,
      font_color: '#F5F5DC',
      font_bold: false,
      font_italic: true,
      background_type: 'none',
      background_color: '#000000',
      animation_style: 'fade',
      position: 'bottom',
    },
  },
];

templateRouter.get('/', async (req, res, next) => {
  try {
    const { data: templates, error } = await supabase
      .from('templates')
      .select('*')
      .or(`is_public.eq.true,user_id.eq.${req.user?.id || ''}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const allTemplates = [...DEFAULT_TEMPLATES, ...(templates || [])];
    res.json(allTemplates);
  } catch (err) {
    next(err);
  }
});

templateRouter.post('/', async (req, res, next) => {
  try {
    const { name, style, isPublic = false } = req.body;

    if (!name || !style) {
      return res.status(400).json({ error: 'name and style are required' });
    }

    const { data: template, error } = await supabase
      .from('templates')
      .insert({
        user_id: req.user?.id || 'anonymous',
        name,
        style,
        is_public: isPublic,
      })
      .select()
      .single();

    if (error) throw error;

    res.json(template);
  } catch (err) {
    next(err);
  }
});

templateRouter.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user?.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
