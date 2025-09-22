import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton, Tooltip, Menu, MenuItem } from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';

const langs = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'hi', label: 'हिन्दी' },
] as const;

export default function LanguageButton() {
  const { i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const changeLang = (code: string) => () => {
    i18n.changeLanguage(code);
    handleClose();
  };

  const current = i18n.resolvedLanguage || i18n.language || 'en';

  return (
    <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 1000 }}>
      <Tooltip title={`Language: ${current.toUpperCase()}`}>
        <IconButton color="primary" onClick={handleOpen} aria-label="change language" size="small">
          <TranslateIcon />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        {langs.map((l) => (
          <MenuItem key={l.code} selected={l.code === current} onClick={changeLang(l.code)}>
            {l.label}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
}
