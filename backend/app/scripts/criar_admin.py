"""Cria o admin inicial: python -m app.scripts.criar_admin --email X [--senha Y]"""
import argparse
import getpass
import sys

from sqlalchemy import select

from ..core.seguranca import criar_hash
from ..database import SessionLocal
from ..models import User


def criar_admin(db, email: str, senha: str) -> User:
    if db.scalar(select(User).where(User.email == email)):
        raise ValueError("E-mail já cadastrado")

    admin = User(email=email, senha=criar_hash(senha), tipo="admin")
    db.add(admin)
    db.commit()
    db.refresh(admin)

    return admin


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Cria um usuário admin")
    parser.add_argument("--email", required=True)
    parser.add_argument("--senha", help="Se omitida, será pedida sem eco no terminal")
    args = parser.parse_args(argv)

    if args.senha:
        print(
            "Aviso: a senha em --senha fica no histórico do shell e na lista de processos. "
            "Omita --senha para digitá-la sem eco (getpass).",
            file=sys.stderr,
        )

    senha = args.senha or getpass.getpass("Senha: ")
    if not senha:
        print("Senha não pode ser vazia", file=sys.stderr)
        return 1

    with SessionLocal() as db:
        try:
            admin = criar_admin(db, args.email, senha)
        except ValueError as erro:
            print(erro, file=sys.stderr)
            return 1

    print(f"Admin criado: {admin.email}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
