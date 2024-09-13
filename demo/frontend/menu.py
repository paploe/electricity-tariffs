import streamlit as st


def menu():
    st.sidebar.page_link("./pages/analysis.py", label="Analysis")
    st.sidebar.page_link("./pages/process.py", label="Process")
